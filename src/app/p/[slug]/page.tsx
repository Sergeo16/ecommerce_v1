'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

export default function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { t } = useLocale();
  const [product, setProduct] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrls: string[];
    companyProfile?: { companyName: string; slug: string };
    category?: { name: string };
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    const url = id ? `/api/products/${id}` : `/api/products/slug/${slug}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProduct);
  }, [id, slug]);

  if (!product) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 px-4">
        <div className="navbar-start">
          <Link href="/catalog" className="btn btn-ghost">← {t('catalog')}</Link>
        </div>
        <div className="navbar-end gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <figure className="bg-base-300 rounded-lg h-80 flex items-center justify-center">
            {product.imageUrls?.[0] ? (
              <img src={product.imageUrls[0]} alt={product.name} className="rounded-lg object-cover w-full h-full" />
            ) : (
              <span className="text-8xl opacity-50">📦</span>
            )}
          </figure>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.category && <p className="badge badge-ghost mt-2">{product.category.name}</p>}
            <p className="text-2xl text-primary font-bold mt-4">{product.price.toLocaleString()} XOF</p>
            {product.description && <p className="mt-4 text-base-content/80">{product.description}</p>}
            {product.companyProfile && (
              <p className="mt-2 text-sm">{t('soldBy')} {product.companyProfile.companyName}</p>
            )}
            <div className="mt-6 flex gap-4">
              <Link href={`/checkout?productId=${product.id}&qty=1`} className="btn btn-primary">
                {t('buy')}
              </Link>
              <Link href="/catalog" className="btn btn-outline">{t('backToCatalog')}</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
