import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** GET : détail d'une commande pour l'admin (tous les éléments pour confier la livraison). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const role = request.headers.get('x-user-role');
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { orderId } = await params;
  if (!orderId) return NextResponse.json({ error: 'orderId requis' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      companyProfile: {
        select: {
          id: true,
          companyName: true,
          slug: true,
          address: true,
          city: true,
          addressLat: true,
          addressLng: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        },
      },
      items: { include: { product: { select: { id: true, name: true, slug: true } } } },
      delivery: {
        include: {
          courier: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

  const cp = order.companyProfile;
  const serialized = {
    ...order,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    advancePaid: Number(order.advancePaid),
    balanceDue: Number(order.balanceDue),
    shippingAmount: Number(order.shippingAmount),
    companyProfile: cp
      ? {
          ...cp,
          address: cp.address ?? null,
          city: cp.city ?? null,
          addressLat: cp.addressLat != null ? Number(cp.addressLat) : null,
          addressLng: cp.addressLng != null ? Number(cp.addressLng) : null,
        }
      : null,
    delivery: order.delivery
      ? {
          ...order.delivery,
          externalCourierName: order.delivery.externalCourierName,
          externalCourierPhone: order.delivery.externalCourierPhone,
        }
      : null,
  };

  return NextResponse.json(serialized);
}
