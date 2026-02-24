'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency?: string;
  description: string | null;
  imageUrls: string[];
  category?: { name: string; slug: string };
  companyProfile?: { companyName: string; slug: string };
}

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const categorySlug = searchParams.get('category');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((c) => setCategories(c ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (q.trim()) params.set('q', q.trim());
    params.set('limit', '50');
    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [categorySlug, q]);

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 shadow px-2 sm:px-4 min-h-12 sm:min-h-14 py-1 gap-1 sm:gap-2 flex-nowrap overflow-x-hidden w-full max-w-full">
        <div className="navbar-start shrink-0 min-w-0 max-w-[35%] sm:max-w-none">
          <AppLogo className="btn btn-ghost btn-sm text-base px-1 sm:px-2 truncate max-w-[110px] sm:max-w-[160px] md:max-w-none" />
        </div>
        <div className="navbar-center flex-1 min-w-0 justify-center px-1">
          <input
            type="search"
            placeholder={t('search')}
            className="input input-bordered w-full max-w-[120px] sm:max-w-48 md:max-w-72 min-w-0 input-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="navbar-end shrink-0 flex-nowrap gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <Link href="/auth/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">{t('login')}</Link>
          <Link href="/dashboard" className="btn btn-primary btn-sm">{t('dashboard')}</Link>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 max-w-full min-w-0">
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/catalog" className="btn btn-sm btn-ghost">{t('all')}</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/catalog?category=${c.slug}`} className="btn btn-sm btn-outline">
              {c.name}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => {
              const mainIdx = (p as { mainImageIndex?: number }).mainImageIndex ?? 0;
              const img = p.imageUrls?.[mainIdx] ?? p.imageUrls?.[0];
              return (
              <Link key={p.id} href={`/p/${p.slug}?id=${p.id}`}>
                <div className="card bg-base-100 shadow hover:shadow-xl transition-shadow">
                  <figure className="h-40 bg-base-300">
                    {img ? (
                      <img src={img} alt={p.name} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-4xl opacity-50">📦</span>
                    )}
                  </figure>
                  <div className="card-body p-4">
                    <h2 className="card-title text-sm line-clamp-2">{p.name}</h2>
                    <p className="text-primary font-bold">{p.price.toLocaleString()} {p.currency ?? 'XOF'}</p>
                    {p.companyProfile && (
                      <p className="text-xs opacity-70">{p.companyProfile.companyName}</p>
                    )}
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        )}
        {!loading && products.length === 0 && (
          <p className="text-center text-base-content/70">{t('noProduct')}</p>
        )}
      </main>
    </div>
  );
}
