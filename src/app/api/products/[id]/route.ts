import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      category: true,
      companyProfile: { select: { companyName: true, slug: true } },
      attributes: true,
      variants: true,
    },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ...product,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    affiliateCommissionPercent: product.affiliateCommissionPercent ? Number(product.affiliateCommissionPercent) : null,
    variants: product.variants.map((v) => ({ ...v, price: Number(v.price) })),
  });
}
