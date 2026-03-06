import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** GET : liste des commissions pour l'admin (filtres par type, statut) */
export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10));

  const where: { type?: string; status?: string } = {};
  if (type && ['PLATFORM', 'AFFILIATE', 'COURIER'].includes(type)) where.type = type;
  if (status && ['PENDING', 'APPROVED', 'ON_HOLD', 'PAID', 'CANCELLED'].includes(status)) where.status = status;

  const commissions = await prisma.commission.findMany({
    where,
    include: {
      order: { select: { orderNumber: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(
    commissions.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      orderNumber: c.order?.orderNumber,
      type: c.type,
      amount: Number(c.amount),
      percent: c.percent != null ? Number(c.percent) : null,
      status: c.status,
      userId: c.userId,
      user: c.user,
      affiliateLinkId: c.affiliateLinkId,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}
