import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDeliveryTrackingEnabled } from '@/lib/rules-engine';
import { verifyAccessToken } from '@/lib/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const enabled = await getDeliveryTrackingEnabled();
  if (!enabled) {
    return NextResponse.json(
      { error: 'Le suivi livraison est désactivé par l’administrateur.', status: null },
      { status: 403 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentification requise pour consulter le suivi.', status: null }, { status: 401 });
  }
  const payload = await verifyAccessToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ error: 'Token invalide.', status: null }, { status: 401 });
  }
  const userId = payload.sub;
  const role = payload.role;

  const { orderId } = await params;
  const delivery = await prisma.delivery.findFirst({
    where: { orderId },
    include: {
      order: {
        select: {
          orderNumber: true,
          status: true,
          userId: true,
          companyProfileId: true,
          companyProfile: { select: { userId: true } },
        },
      },
      courier: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  if (!delivery) {
    return NextResponse.json({ error: 'Livraison non trouvée', status: null }, { status: 404 });
  }

  const order = delivery.order as {
    orderNumber: string;
    status: string;
    userId: string | null;
    companyProfileId: string;
    companyProfile: { userId: string };
  };

  const isAdmin = role === 'SUPER_ADMIN';
  const isClient = order.userId === userId;
  const isSupplier = order.companyProfile?.userId === userId;

  if (!isAdmin && !isClient && !isSupplier) {
    return NextResponse.json(
      { error: 'Vous n’êtes pas autorisé à consulter le suivi de cette commande.', status: null },
      { status: 403 }
    );
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
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
