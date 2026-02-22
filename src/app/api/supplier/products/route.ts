import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || (role !== 'SUPPLIER' && role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cp = await prisma.companyProfile.findFirst({ where: { userId } });
  if (!cp && role === 'SUPPLIER') return NextResponse.json({ products: [] });

  const where = role === 'SUPER_ADMIN' ? {} : { companyProfileId: cp!.id };
  const products = await prisma.product.findMany({
    where,
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(
    products.map((p) => ({
      ...p,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      affiliateCommissionPercent: p.affiliateCommissionPercent ? Number(p.affiliateCommissionPercent) : null,
    }))
  );
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || (role !== 'SUPPLIER' && role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cp = await prisma.companyProfile.findFirst({ where: { userId } });
  if (!cp && role === 'SUPPLIER') return NextResponse.json({ error: 'Company profile required' }, { status: 403 });

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name : '';
  const slug = typeof body.slug === 'string' ? body.slug : name.toLowerCase().replace(/\s+/g, '-');
  const description = body.description ?? null;
  const productType = body.productType ?? 'PHYSICAL';
  const price = parseFloat(body.price);
  const affiliateCommissionPercent = body.affiliateCommissionPercent != null ? parseFloat(body.affiliateCommissionPercent) : null;
  const sku = body.sku ?? null;
  const trackInventory = body.trackInventory !== false;
  const stockQuantity = parseInt(body.stockQuantity, 10) || 0;
  const categoryId = body.categoryId ?? null;
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];

  if (!name || !Number.isFinite(price)) {
    return NextResponse.json({ error: 'name et price requis' }, { status: 400 });
  }

  const companyId = cp?.id ?? body.companyProfileId;
  if (!companyId) return NextResponse.json({ error: 'companyProfileId required' }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      companyProfileId: companyId,
      categoryId: categoryId || undefined,
      name,
      slug: slug || `product-${Date.now()}`,
      description,
      productType,
      price,
      affiliateCommissionPercent,
      sku,
      trackInventory,
      stockQuantity,
      imageUrls,
      isActive: true,
    },
  });

  return NextResponse.json({
    ...product,
    price: Number(product.price),
    affiliateCommissionPercent: product.affiliateCommissionPercent ? Number(product.affiliateCommissionPercent) : null,
  });
}
