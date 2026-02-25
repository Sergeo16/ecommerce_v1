'use client';

import { useEffect, useState, useMemo } from 'react';
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

/** Extrait l’ID vidéo YouTube d’une URL (youtube.com/watch?v=ID ou youtu.be/ID). */
function getYoutubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      return u.searchParams.get('v') || null;
    }
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  } catch {
    return null;
  }
  return null;
}

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency?: string;
  imageUrls: string[];
  mainImageIndex?: number;
  videoUrls?: string[];
  companyProfile?: { companyName: string; slug: string };
  category?: { name: string };
};

export default function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { t } = useLocale();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!slug) return;
    const url = id ? `/api/products/${id}` : `/api/products/slug/${slug}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p) setProduct(p);
      });
  }, [id, slug]);

  useEffect(() => {
    if (product?.imageUrls?.length) {
      const main = product.mainImageIndex ?? 0;
      setSelectedImageIndex(main >= 0 && main < product.imageUrls.length ? main : 0);
    }
  }, [product?.id, product?.imageUrls, product?.mainImageIndex]);

  const images = product?.imageUrls ?? [];
  const imageUrlsAbs = useMemo(() => images.map((u) => toAbsoluteImageUrl(u)), [images]);

  if (!product) return <div className="p-8 text-center">{t('loading')}</div>;

  const videos = product.videoUrls ?? [];
  const mainIndex = product.mainImageIndex ?? 0;
  const displayIndex = selectedImageIndex >= 0 && selectedImageIndex < images.length ? selectedImageIndex : mainIndex;
  const mainImageUrl = images[displayIndex] ?? images[0];
  const mainImageUrlAbs = mainImageUrl ? toAbsoluteImageUrl(mainImageUrl) : '';

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 px-2 sm:px-4 min-h-12 sm:min-h-14 py-1 gap-1 sm:gap-2 flex-nowrap overflow-x-hidden w-full max-w-full">
        <div className="navbar-start shrink-0 min-w-0 max-w-[70%] sm:max-w-none flex-nowrap gap-1">
          <AppLogo className="btn btn-ghost btn-sm text-base px-1 truncate max-w-[100px] sm:max-w-[140px] md:max-w-none" />
          <Link href="/catalog" className="btn btn-ghost btn-sm whitespace-nowrap shrink-0">← {t('catalog')}</Link>
        </div>
        <div className="navbar-end shrink-0 flex-nowrap gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 max-w-full min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Galerie : image principale + miniatures */}
          <div className="space-y-3">
            <figure className="bg-base-300 rounded-lg aspect-square max-h-[400px] flex items-center justify-center overflow-hidden">
              {mainImageUrlAbs ? (
                <img
                  src={mainImageUrlAbs}
                  alt={product.name}
                  className="object-contain w-full h-full"
                />
              ) : (
                <span className="text-8xl opacity-50">📦</span>
              )}
            </figure>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      i === displayIndex ? 'border-primary' : 'border-base-300'
                    }`}
                    onClick={() => setSelectedImageIndex(i)}
                  >
                    <img src={imageUrlsAbs[i] ?? url} alt="" className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}
            {/* Vidéos : YouTube en iframe, sinon lecteur vidéo direct */}
            {videos.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-base-300">
                <h3 className="font-semibold">Vidéos</h3>
                {videos.map((url, i) => {
                  const ytId = getYoutubeVideoId(url);
                  if (ytId) {
                    const embedUrl = `https://www.youtube.com/embed/${ytId}`;
                    return (
                      <div key={i} className="rounded-lg overflow-hidden bg-base-300 aspect-video max-h-64">
                        <iframe
                          src={embedUrl}
                          title={`Vidéo ${i + 1}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                  const directUrl = url.startsWith('http') ? url : (url.startsWith('/') ? url : `/${url}`);
                  return (
                    <div key={i} className="rounded-lg overflow-hidden bg-base-300 aspect-video max-h-64">
                      <video src={directUrl} controls className="w-full h-full object-contain" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold break-words">{product.name}</h1>
            {product.category && (
              <p className="badge badge-ghost mt-2">{product.category.name}</p>
            )}
            <p className="text-2xl text-primary font-bold mt-4">{product.price.toLocaleString()} {product.currency ?? 'XOF'}</p>
            {product.description && (
              <div className="mt-4 text-base-content/80 prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap break-words">{product.description}</p>
              </div>
            )}
            {product.companyProfile && (
              <p className="mt-2 text-sm opacity-80">{t('soldBy')} {product.companyProfile.companyName}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('quantity')}:</span>
                <div className="join">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline join-item"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="-"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    className="input input-bordered input-sm join-item w-16 text-center"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)))}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline join-item"
                    onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                    aria-label="+"
                  >
                    +
                  </button>
                </div>
              </div>
              <Link href={`/checkout?productId=${product.id}&qty=${quantity}`} className="btn btn-primary">
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
