'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
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
      <header className="navbar bg-base-100 shadow px-4">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl">{t('appName')}</Link>
        </div>
        <div className="navbar-center">
          <input
            type="search"
            placeholder={t('search')}
            className="input input-bordered w-64 md:w-96"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="navbar-end gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <Link href="/auth/login" className="btn btn-ghost">{t('login')}</Link>
          <Link href="/dashboard" className="btn btn-primary">{t('dashboard')}</Link>
        </div>
      </header>

      <main className="container mx-auto p-6">
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
            {products.map((p) => (
              <Link key={p.id} href={`/p/${p.slug}?id=${p.id}`}>
                <div className="card bg-base-100 shadow hover:shadow-xl transition-shadow">
                  <figure className="h-40 bg-base-300">
                    {p.imageUrls?.[0] ? (
                      <img src={p.imageUrls[0]} alt={p.name} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-4xl opacity-50">📦</span>
                    )}
                  </figure>
                  <div className="card-body p-4">
                    <h2 className="card-title text-sm line-clamp-2">{p.name}</h2>
                    <p className="text-primary font-bold">{p.price.toLocaleString()} XOF</p>
                    {p.companyProfile && (
                      <p className="text-xs opacity-70">{p.companyProfile.companyName}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!loading && products.length === 0 && (
          <p className="text-center text-base-content/70">{t('noProduct')}</p>
        )}
      </main>
    </div>
  );
}
