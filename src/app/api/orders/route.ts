import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPaymentRules } from '@/lib/rules-engine';
import { addOrderJob, addCommissionJob } from '@/lib/queue';
import type { PaymentModeOrder } from '@prisma/client';

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
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  const affiliateLinkId = typeof body.affiliateLinkId === 'string' ? body.affiliateLinkId : null;
  const paymentMode = (body.paymentMode as PaymentModeOrder) ?? 'FULL_UPFRONT';
  const advancePercent = typeof body.advancePercent === 'number' ? body.advancePercent : null;
  const shippingAddress = body.shippingAddress && typeof body.shippingAddress === 'object' ? body.shippingAddress : null;

  if (items.length === 0 || !shippingAddress) {
    return NextResponse.json({ error: 'items et shippingAddress requis' }, { status: 400 });
  }

  const rules = await getPaymentRules({ userId });
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
  const subtotal = items.reduce((sum: number, i: { productId: string; quantity: number }) => {
    const p = products.find((x) => x.id === i.productId);
    return sum + Number(p?.price ?? 0) * (i.quantity || 1);
  }, 0);
  const shippingAmount = 2000;
  const total = subtotal + shippingAmount;
  const advance = paymentMode === 'FULL_UPFRONT' ? total : paymentMode === 'PARTIAL_ADVANCE' ? (total * (advancePercent ?? 30)) / 100 : 0;
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      companyProfileId: companyId,
      status: 'PENDING',
      paymentMode,
      advancePercent: advancePercent ?? null,
      subtotal,
      shippingAmount,
      total,
      advancePaid: 0,
      balanceDue: total - advance,
      currency: 'XOF',
      affiliateLinkId,
      shippingAddress,
    },
  });

  for (const i of items) {
    const p = products.find((x) => x.id === i.productId)!;
    const qty = Math.max(1, i.quantity || 1);
    const unitPrice = Number(p.price);
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: p.id,
        quantity: qty,
        unitPrice,
        total: unitPrice * qty,
        affiliateCommissionPercent: p.affiliateCommissionPercent,
      },
    });
  }

  await addOrderJob('created', { orderId: order.id });
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
