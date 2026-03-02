import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const notificationModel = (prisma as { notification?: { findMany: (args: unknown) => Promise<unknown[]>; count: (args: { where: unknown }) => Promise<number> } }).notification;
  if (!notificationModel) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  const where: { userId: string; readAt?: null } = { userId };
  if (unreadOnly) where.readAt = null;

  const notifications = await notificationModel.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await notificationModel.count({
    where: { userId, readAt: null },
  });

  return NextResponse.json({ notifications, unreadCount });
}
