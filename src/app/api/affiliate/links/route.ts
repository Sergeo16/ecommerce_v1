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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const linksWithUrl = links.map((link) => {
    let trackingLink: string;
    if (link.product?.slug) {
      trackingLink = `${baseUrl}/p/${link.product.slug}?ref=${link.referralCode}`;
    } else if (link.categorySlug) {
      trackingLink = `${baseUrl}/catalog?category=${encodeURIComponent(link.categorySlug)}&ref=${link.referralCode}`;
    } else {
      trackingLink = `${baseUrl}/catalog?ref=${link.referralCode}`;
    }
    return { ...link, trackingLink };
  });
  return NextResponse.json(linksWithUrl);
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || role !== 'AFFILIATE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const productId = typeof body.productId === 'string' ? body.productId : null;
  const categorySlug = typeof body.categorySlug === 'string' ? body.categorySlug.trim() || null : null;
  const utmSource = typeof body.utmSource === 'string' ? body.utmSource : null;
  const utmMedium = typeof body.utmMedium === 'string' ? body.utmMedium : null;
  const utmCampaign = typeof body.utmCampaign === 'string' ? body.utmCampaign : null;

  const slug = `aff-${userId.slice(-8)}-${Date.now().toString(36)}`;
  const referralCode = `REF-${Date.now().toString(36).toUpperCase()}`;

  const link = await prisma.affiliateLink.create({
    data: {
      userId,
      productId: productId || null,
      categorySlug: categorySlug || null,
      slug,
      referralCode,
      utmSource,
      utmMedium,
      utmCampaign,
    },
    include: { product: { select: { name: true, slug: true } } },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  let trackingLink: string;
  if (link.product?.slug) {
    trackingLink = `${baseUrl}/p/${link.product.slug}?ref=${link.referralCode}`;
  } else if (link.categorySlug) {
    trackingLink = `${baseUrl}/catalog?category=${encodeURIComponent(link.categorySlug)}&ref=${link.referralCode}`;
  } else {
    trackingLink = `${baseUrl}/catalog?ref=${link.referralCode}`;
  }

  return NextResponse.json({
    ...link,
    trackingLink,
    shareUrl: trackingLink,
  });
}
