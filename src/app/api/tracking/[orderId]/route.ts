import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const delivery = await prisma.delivery.findFirst({
    where: { orderId },
    include: {
      order: { select: { orderNumber: true, status: true } },
      courier: { select: { firstName: true, lastName: true, phone: true } },
    },
  });
  if (!delivery) {
    return NextResponse.json({ error: 'Livraison non trouvée', status: null }, { status: 404 });
  }
  return NextResponse.json({
    orderNumber: delivery.order.orderNumber,
    status: delivery.status,
    stages: [
      delivery.status === 'PENDING' && { label: 'En attente', done: true },
      ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(delivery.status) && { label: 'Assignée', done: true },
      ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(delivery.status) && { label: 'Enlevée', done: true },
      ['IN_TRANSIT', 'DELIVERED'].includes(delivery.status) && { label: 'En route', done: true },
      delivery.status === 'DELIVERED' && { label: 'Livrée', done: true },
    ].filter(Boolean),
    courier: delivery.courier,
    pickedUpAt: delivery.pickedUpAt,
    deliveredAt: delivery.deliveredAt,
  });
}
