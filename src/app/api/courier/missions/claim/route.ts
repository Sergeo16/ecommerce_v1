import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addEmailJob, addNotificationJob } from '@/lib/queue';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || role !== 'COURIER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const deliveryId = typeof body.deliveryId === 'string' ? body.deliveryId : '';
  if (!deliveryId) {
    return NextResponse.json({ error: 'deliveryId requis' }, { status: 400 });
  }

  const updated = await prisma.delivery.updateMany({
    where: { id: deliveryId, courierId: null, status: 'PENDING' },
    data: { courierId: userId, status: 'ASSIGNED' },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: 'ALREADY_TAKEN' }, { status: 409 });
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      order: {
        include: {
          companyProfile: {
            include: {
              user: { select: { email: true, phone: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      courier: {
        select: { firstName: true, lastName: true, phone: true, email: true },
      },
    },
  });

  if (delivery?.order?.companyProfile?.user?.email && delivery.courier) {
    await addEmailJob(
      delivery.order.companyProfile.user.email,
      'Commande prise en charge par un livreur',
      'supplier_delivery_assigned',
      {
        companyName: delivery.order.companyProfile.companyName,
        orderNumber: delivery.order.orderNumber,
        courierFirstName: delivery.courier.firstName,
        courierLastName: delivery.courier.lastName,
        courierPhone: delivery.courier.phone ?? null,
      }
    ).catch(() => {});
  }

  if (delivery?.order?.companyProfile?.user?.phone && delivery.courier) {
    await addNotificationJob('whatsapp', {
      to: delivery.order.companyProfile.user.phone,
      type: 'supplier_delivery_assigned',
      orderNumber: delivery.order.orderNumber,
      courierFirstName: delivery.courier.firstName,
      courierLastName: delivery.courier.lastName,
      courierPhone: delivery.courier.phone ?? null,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

