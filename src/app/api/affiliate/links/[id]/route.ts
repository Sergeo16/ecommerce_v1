import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || role !== 'AFFILIATE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const link = await prisma.affiliateLink.findFirst({
    where: { id, userId },
  });
  if (!link) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.affiliateLink.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
