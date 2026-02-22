import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const amount = typeof body.amount === 'number' ? body.amount : parseFloat(body.amount);

  if (!orderId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'orderId et amount requis' }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const result = await createPaymentIntent(amount, order.currency, { orderId, userId });
  if (!result) {
    return NextResponse.json({
      mock: true,
      clientSecret: `mock_${orderId}_${amount}`,
      message: 'Stripe non configuré — utiliser mock ou Mobile Money',
    });
  }
  return NextResponse.json({ clientSecret: result.clientSecret, id: result.id });
}
