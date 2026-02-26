'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

/** URL absolue pour les images (uploads /api/...) afin qu’elles s’affichent correctement. */
function toAbsoluteImageUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  if (!url || url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${window.location.origin}${path}`;
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

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
      <header className="navbar bg-base-100 shadow px-2 sm:px-4 min-h-12 sm:min-h-14 py-1 gap-1 sm:gap-2 flex-nowrap overflow-visible w-full max-w-full min-w-0">
        {/* Logo : visible en entier sur petit écran */}
        <div className="navbar-start min-w-0 flex-1 sm:flex-initial sm:flex-none pl-0 pr-1">
          <AppLogo className="btn btn-ghost text-sm sm:text-base px-1 sm:px-2 py-2 normal-case hover:opacity-90 no-underline overflow-visible text-left w-full sm:w-auto max-w-full font-bold tracking-tight" />
        </div>
        {/* Recherche */}
        <div className="navbar-center flex-1 min-w-0 justify-center px-1 max-w-[140px] sm:max-w-[200px] md:max-w-[280px]">
          <input
            type="search"
            placeholder={t('search')}
            className="input input-bordered w-full min-w-0 input-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {/* Desktop : thème, langue, connexion, dashboard */}
        <div className="navbar-end shrink-0 flex-nowrap gap-1 hidden sm:flex">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <Link href="/auth/login" className="btn btn-ghost btn-sm">{t('login')}</Link>
          <Link href="/dashboard" className="btn btn-primary btn-sm">{t('dashboard')}</Link>
        </div>
        {/* Mobile : bouton menu — ouvre une modal (contenu au premier plan) */}
        <div className="navbar-end sm:hidden shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Modal menu mobile : overlay plein écran, choix au premier plan */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMenu} aria-hidden />
          <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm py-4 overflow-y-auto max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 pb-3 border-b border-base-300">
              <span className="font-semibold text-lg">Menu</span>
              <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={closeMenu} aria-label="Fermer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex flex-col py-2">
              <Link href="/auth/login" className="px-4 py-3 hover:bg-base-200 text-left font-medium" onClick={closeMenu}>{t('login')}</Link>
              <Link href="/dashboard" className="px-4 py-3 hover:bg-base-200 text-left font-medium" onClick={closeMenu}>{t('dashboard')}</Link>
              <div className="border-t border-base-300 my-2" />
              <div className="px-4 py-3 flex items-center gap-2">
                <ThemeSwitcher />
                <LocaleSwitcher />
              </div>
            </nav>
          </div>
        </div>
      )}

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
              const imgSrc = img ? toAbsoluteImageUrl(img) : '';
              return (
              <Link key={p.id} href={`/p/${p.slug}?id=${p.id}`}>
                <div className="card bg-base-100 shadow hover:shadow-xl transition-shadow">
                  <figure className="h-40 bg-base-300">
                    {imgSrc ? (
                      <img src={imgSrc} alt={p.name} className="object-cover w-full h-full" />
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
