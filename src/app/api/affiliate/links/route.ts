import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || (role !== 'AFFILIATE' && role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const where = role === 'SUPER_ADMIN' ? {} : { userId };
  const links = await prisma.affiliateLink.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(links);
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || role !== 'AFFILIATE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const productId = typeof body.productId === 'string' ? body.productId : null;
  const utmSource = typeof body.utmSource === 'string' ? body.utmSource : null;
  const utmMedium = typeof body.utmMedium === 'string' ? body.utmMedium : null;
  const utmCampaign = typeof body.utmCampaign === 'string' ? body.utmCampaign : null;

  const slug = `aff-${userId.slice(-8)}-${Date.now().toString(36)}`;
  const referralCode = `REF-${Date.now().toString(36).toUpperCase()}`;

  const link = await prisma.affiliateLink.create({
    data: {
      userId,
      productId,
      slug,
      referralCode,
      utmSource,
      utmMedium,
      utmCampaign,
    },
    include: { product: { select: { name: true } } },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const trackingLink = `${baseUrl}/p/${link.product?.slug ?? 'catalog'}?ref=${link.referralCode}`;

  return NextResponse.json({
    ...link,
    trackingLink,
    shareUrl: trackingLink,
  });
}
