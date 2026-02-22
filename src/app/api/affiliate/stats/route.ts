import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || role !== 'AFFILIATE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [clicks, conversions, commissions, pending, ranking] = await Promise.all([
    prisma.affiliateLink.aggregate({ where: { userId }, _sum: { clickCount: true } }),
    prisma.affiliateLink.aggregate({ where: { userId }, _sum: { conversionCount: true } }),
    prisma.commission.aggregate({
      where: { userId, type: 'AFFILIATE' },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { userId, type: 'AFFILIATE', status: 'PENDING' },
      _sum: { amount: true },
    }),
    prisma.commission.groupBy({
      by: ['userId'],
      where: { type: 'AFFILIATE' },
      _sum: { amount: true },
    }),
  ]);

  const sorted = (ranking ?? []).sort((a, b) => Number(b._sum.amount ?? 0) - Number(a._sum.amount ?? 0));
  const rank = sorted.findIndex((r) => r.userId === userId) + 1 || 0;

  return NextResponse.json({
    totalClicks: clicks._sum.clickCount ?? 0,
    totalConversions: conversions._sum.conversionCount ?? 0,
    totalCommissions: Number(commissions._sum.amount ?? 0),
    pendingCommissions: Number(pending._sum.amount ?? 0),
    ranking: rank,
    totalAffiliates: sorted.length,
  });
}
