import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPaymentRules } from '@/lib/rules-engine';
import { addOrderJob, addCommissionJob, addDeliveryJob } from '@/lib/queue';
import { initiateMobileMoneyPayment, checkMobileMoneyStatus } from '@/lib/mobile-money';
import { isPaymentAcceptedCurrency, convertToXOF } from '@/lib/currency';
import { getShippingAmountXOF, shippingInCurrency } from '@/lib/shipping';
import type { PaymentModeOrder, PaymentMethod } from '@prisma/client';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));

  const where: { userId?: string; companyProfileId?: string } = {};
  if (role === 'CLIENT' || role === 'AFFILIATE') where.userId = userId;
  else if (role === 'SUPPLIER') {
    const cp = await prisma.companyProfile.findFirst({ where: { userId } });
    if (cp) where.companyProfileId = cp.id;
    else return NextResponse.json({ orders: [], total: 0, page, limit });
  } else if (role !== 'SUPER_ADMIN') where.userId = userId;

  if (role === 'SUPER_ADMIN') {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          companyProfile: { select: { companyName: true, slug: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      prisma.order.count(),
    ]);
    return NextResponse.json({ orders, total, page, limit });
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        companyProfile: { select: { companyName: true, slug: true } },
        items: { include: { product: { select: { name: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  const serialized = orders.map((o) => ({
    ...o,
    subtotal: Number(o.subtotal),
    total: Number(o.total),
    advancePaid: Number(o.advancePaid),
    balanceDue: Number(o.balanceDue),
    shippingAmount: Number(o.shippingAmount),
  }));

  return NextResponse.json({ orders: serialized, total, page, limit });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  const affiliateLinkId = typeof body.affiliateLinkId === 'string' ? body.affiliateLinkId : null;
  const paymentMode = (body.paymentMode as PaymentModeOrder) ?? 'FULL_UPFRONT';
  const advancePercent = typeof body.advancePercent === 'number' ? body.advancePercent : null;
  const shippingAddress = body.shippingAddress && typeof body.shippingAddress === 'object' ? body.shippingAddress : null;

  const isGuest = !userId;
  const guestEmail = typeof body.guestEmail === 'string' ? body.guestEmail.trim() : '';
  const guestFirstName = typeof body.guestFirstName === 'string' ? body.guestFirstName.trim().slice(0, 100) : null;
  const guestLastName = typeof body.guestLastName === 'string' ? body.guestLastName.trim().slice(0, 100) : null;

  if (items.length === 0 || !shippingAddress) {
    return NextResponse.json({ error: 'items et shippingAddress requis' }, { status: 400 });
  }
  if (isGuest) {
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return NextResponse.json({ error: 'guestEmail valide requis pour achat invité' }, { status: 400 });
    }
  }

  const rules = await getPaymentRules({ userId: userId ?? undefined });
  if (paymentMode === 'FULL_UPFRONT' && !rules.fullUpfront) {
    return NextResponse.json({ error: 'Mode de paiement non autorisé' }, { status: 400 });
  }
  if (paymentMode === 'PARTIAL_ADVANCE' && (!rules.partialAdvance || (advancePercent ?? 0) < rules.minAdvancePercent)) {
    return NextResponse.json({ error: 'Avance minimum: ' + rules.minAdvancePercent + '%' }, { status: 400 });
  }
  if (paymentMode === 'PAY_ON_DELIVERY' && !rules.payOnDelivery) {
    return NextResponse.json({ error: 'Paiement à la livraison non autorisé' }, { status: 400 });
  }

  const productIds = items.map((i: { productId: string }) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { companyProfile: true },
  });
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json({ error: 'Un ou plusieurs produits invalides' }, { status: 400 });
  }

  const companyId = products[0].companyProfileId;
  const bodyCurrency =
    typeof body.currency === 'string' && body.currency.trim()
      ? String(body.currency).trim().toUpperCase()
      : null;
  const bodySubtotal = typeof body.subtotal === 'number' ? body.subtotal : null;
  const bodyShipping = typeof body.shippingAmount === 'number' ? body.shippingAmount : null;
  const bodyTotal = typeof body.total === 'number' ? body.total : null;

  let currency: string;
  let subtotal: number;
  let shippingAmount: number;
  let total: number;

  if (
    bodyCurrency != null &&
    bodySubtotal != null &&
    bodyShipping != null &&
    bodyTotal != null
  ) {
    currency = bodyCurrency;
    subtotal = bodySubtotal;
    shippingAmount = bodyShipping;
    total = bodyTotal;
  } else {
    subtotal = items.reduce((sum: number, i: { productId: string; quantity: number }) => {
      const p = products.find((x) => x.id === i.productId);
      return sum + Number(p?.price ?? 0) * (i.quantity || 1);
    }, 0);
    const productCurrency = (products[0].currency as string) || 'XOF';
    currency = productCurrency;
    const shippingXOF = await getShippingAmountXOF(companyId ?? undefined);
    shippingAmount = shippingInCurrency(shippingXOF, productCurrency);
    total = subtotal + shippingAmount;
  }

  if (paymentMode === 'FULL_UPFRONT' || paymentMode === 'PARTIAL_ADVANCE') {
    if (!isPaymentAcceptedCurrency(currency)) {
      return NextResponse.json(
        { error: `Le paiement n'est pas pris en charge pour la devise ${currency}. Utilisez une devise acceptée (ex. XOF) après conversion.` },
        { status: 400 }
      );
    }
  }

  const advance = paymentMode === 'FULL_UPFRONT' ? total : paymentMode === 'PARTIAL_ADVANCE' ? (total * (advancePercent ?? 30)) / 100 : 0;
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Étape 1 & 2 : initier paiement Mobile Money + vérifier succès
  // (sauf pour paiement à la livraison où aucun paiement n'est requis avant la commande)
  let paidAmount = 0;
  let paymentMethod: PaymentMethod | null = null;
  let externalPaymentId: string | null = null;

  if (paymentMode === 'FULL_UPFRONT' || paymentMode === 'PARTIAL_ADVANCE') {
    const amountToPay = paymentMode === 'FULL_UPFRONT' ? total : advance;
    if (currency !== 'XOF') {
      return NextResponse.json(
        { error: 'Le paiement Mobile Money est en XOF. Passez par la conversion proposée sur la page de commande.' },
        { status: 400 }
      );
    }
    const phoneFromShipping =
      shippingAddress && typeof (shippingAddress as { phone?: unknown }).phone === 'string'
        ? String((shippingAddress as { phone?: string }).phone).trim()
        : '';
    if (!phoneFromShipping) {
      return NextResponse.json({ error: 'Téléphone requis pour le paiement Mobile Money' }, { status: 400 });
    }

    // Pour l’instant, on passe par l’abstraction Mobile Money (à brancher sur KKIAPAY / FedaPay / BjPay / Stripe).
    const mmResult = await initiateMobileMoneyPayment({
      amount: Number(amountToPay),
      currency: 'XOF',
      phone: phoneFromShipping,
      provider: 'MTN',
      reference: orderNumber,
      description: `Commande ${orderNumber}`,
    });

    if (!mmResult.success || !mmResult.transactionId) {
      return NextResponse.json({ error: mmResult.message ?? 'Paiement refusé' }, { status: 400 });
    }

    const status = await checkMobileMoneyStatus('MTN', mmResult.transactionId);
    if (status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 400 });
    }

    paidAmount = Number(amountToPay);
    paymentMethod = 'MOBILE_MONEY_MTN';
    externalPaymentId = mmResult.transactionId;
  }

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: userId ?? null,
      guestEmail: isGuest ? guestEmail : null,
      guestFirstName: isGuest ? guestFirstName : null,
      guestLastName: isGuest ? guestLastName : null,
      companyProfileId: companyId,
      status: paymentMode === 'PAY_ON_DELIVERY' ? 'PENDING' : 'CONFIRMED',
      paymentMode,
      advancePercent: advancePercent ?? null,
      subtotal,
      shippingAmount,
      total,
      advancePaid: paidAmount,
      balanceDue: total - paidAmount,
      currency,
      affiliateLinkId,
      shippingAddress,
    },
  });

  const orderCurrency = currency;
  const productCurrencies = new Map(products.map((p) => [p.id, (p.currency as string) || 'XOF']));

  for (const i of items) {
    const p = products.find((x) => x.id === i.productId)!;
    const qty = Math.max(1, i.quantity || 1);
    const productCurrency = productCurrencies.get(p.id) ?? 'XOF';
    const unitPriceSource = Number(p.price);
    const unitPrice =
      orderCurrency === productCurrency
        ? unitPriceSource
        : Math.round(convertToXOF(unitPriceSource, productCurrency) * 100) / 100;
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: p.id,
        quantity: qty,
        unitPrice,
        total: lineTotal,
        affiliateCommissionPercent: p.affiliateCommissionPercent,
      },
    });
  }

  const paymentUserId = userId ?? order.userId;
  if (paymentMethod && paidAmount > 0 && externalPaymentId && paymentUserId) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: paymentUserId,
        amount: paidAmount,
        currency,
        method: paymentMethod,
        status: 'COMPLETED',
        externalId: externalPaymentId,
        metadata: {
          gateway: 'MOBILE_MONEY',
        },
      },
    });
  }

  await addOrderJob('created', { orderId: order.id });
  await addDeliveryJob('created', { orderId: order.id });
  await addCommissionJob(order.id, {});

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      advanceDue: advance,
      balanceDue: Number(order.balanceDue),
    },
  });
}
