import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || role !== 'COURIER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const status = body.status; // ASSIGNED | PICKED_UP | IN_TRANSIT | DELIVERED | FAILED | RETURNED
  const proofPhotoUrl = body.proofPhotoUrl;
  const signatureUrl = body.signatureUrl;
  const notes = body.notes;

  const allowed = ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
  }

  const delivery = await prisma.delivery.findFirst({
    where: { id, courierId: userId },
    include: { order: true },
  });
  if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const update: Record<string, unknown> = { status };
  if (status === 'PICKED_UP') update.pickedUpAt = new Date();
  if (status === 'DELIVERED') update.deliveredAt = new Date();
  if (proofPhotoUrl) update.proofPhotoUrl = proofPhotoUrl;
  if (signatureUrl) update.signatureUrl = signatureUrl;
  if (notes !== undefined) update.notes = notes;

  await prisma.delivery.update({
    where: { id },
    data: update as object,
  });

  if (status === 'DELIVERED') {
    await prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: 'DELIVERED' },
    });
  }

  return NextResponse.json({ ok: true, status });
}
