'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrls: string[];
  mainImageIndex?: number;
  category?: { name: string; slug: string };
};

export default function MyProductsPage() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const canPublish = user?.role === 'SUPPLIER' || user?.role === 'SUPER_ADMIN' || user?.role === 'AFFILIATE';

  useEffect(() => {
    if (!token || !canPublish) return;
    fetch('/api/supplier/products', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((list) => setProducts(Array.isArray(list) ? list : []))
      .finally(() => setLoading(false));
  }, [token, canPublish]);

  if (!user) {
    return (
      <div className="p-8">
        <p>{t('connectToAccessDashboard')}</p>
        <Link href="/auth/login" className="btn btn-primary mt-4">{t('login')}</Link>
      </div>
    );
  }
  if (!canPublish) {
    return (
      <div className="p-8">
        <p>Accès réservé aux fournisseurs, affiliés et administrateurs.</p>
        <Link href="/dashboard" className="btn btn-ghost mt-4">{t('back')}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 shadow px-2 sm:px-4 min-h-12 py-1 gap-1 flex-nowrap overflow-x-hidden w-full max-w-full">
        <div className="navbar-start shrink-0 min-w-0 max-w-[80%] flex-nowrap gap-1">
          <AppLogo className="btn btn-ghost btn-sm px-1 truncate max-w-[120px] sm:max-w-none" />
          <Link href="/dashboard" className="btn btn-ghost btn-sm whitespace-nowrap shrink-0">← {t('dashboard')}</Link>
        </div>
        <div className="navbar-end shrink-0 flex-nowrap gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">{t('myProducts')}</h1>
          <Link href="/dashboard/products/new" className="btn btn-primary">{t('publishProduct')}</Link>
        </div>
        {loading ? (
          <span className="loading loading-spinner" />
        ) : products.length === 0 ? (
          <p className="opacity-70">Aucun produit. <Link href="/dashboard/products/new" className="link">{t('publishProduct')}</Link></p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const mainIdx = p.mainImageIndex ?? 0;
              const img = p.imageUrls?.[mainIdx] ?? p.imageUrls?.[0];
              return (
                <Link key={p.id} href={`/p/${p.slug}?id=${p.id}`}>
                  <div className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
                    <figure className="h-40 bg-base-300">
                      {img ? (
                        <img src={img} alt={p.name} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-4xl opacity-50">📦</span>
                      )}
                    </figure>
                    <div className="card-body p-4">
                      <h2 className="card-title text-sm line-clamp-2">{p.name}</h2>
                      <p className="text-primary font-bold">{p.price?.toLocaleString()} XOF</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
