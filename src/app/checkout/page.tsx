'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

type ProductInfo = { id: string; name: string; price: number };

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const { t } = useLocale();
  const productId = searchParams.get('productId');
  const qty = Math.max(1, parseInt(searchParams.get('qty') ?? '1', 10));

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    fetch(`/api/products/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setProduct({ id: p.id, name: p.name, price: Number(p.price) }))
      .finally(() => setLoading(false));
  }, [productId]);

  const isGuest = !user;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!productId || !product) return;
    const ship = { address: address.trim(), city: city.trim(), phone: phone.trim() || undefined };
    if (!ship.address || !ship.city) {
      setError(t('addressCityRequired'));
      return;
    }
    if (isGuest) {
      const em = email.trim();
      if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        setError(t('emailInvalid'));
        return;
      }
    }
    setSubmitting(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const body: Record<string, unknown> = {
        items: [{ productId, quantity: qty }],
        shippingAddress: ship,
      };
      if (isGuest) {
        body.guestEmail = email.trim();
        body.guestFirstName = firstName.trim().slice(0, 100) || null;
        body.guestLastName = lastName.trim().slice(0, 100) || null;
      }
      const res = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      setOrderNumber(data.order?.orderNumber ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !productId) {
    return (
      <div className="min-h-screen bg-base-200 flex flex-col">
        <header className="navbar bg-base-100 px-2 sm:px-4 min-h-12 py-1 gap-1 flex-nowrap overflow-x-hidden w-full max-w-full">
          <div className="navbar-start shrink-0 min-w-0 max-w-[50%]">
            <AppLogo className="btn btn-ghost btn-sm px-1 truncate max-w-[130px] sm:max-w-none" />
          </div>
          <div className="navbar-end shrink-0 flex-nowrap gap-1">
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
        </header>
        <main className="container mx-auto p-4 sm:p-6 max-w-full min-w-0 flex-1">
          {!productId ? (
            <p className="text-center text-base-content/70">{t('noProduct')}</p>
          ) : (
            <span className="loading loading-spinner mx-auto block w-10" />
          )}
        </main>
      </div>
    );
  }

  if (orderNumber) {
    return (
      <div className="min-h-screen bg-base-200 flex flex-col">
        <header className="navbar bg-base-100 px-2 sm:px-4 min-h-12 py-1 gap-1 flex-nowrap overflow-x-hidden w-full max-w-full">
          <div className="navbar-start shrink-0 min-w-0 max-w-[50%]">
            <AppLogo className="btn btn-ghost btn-sm px-1 truncate max-w-[130px] sm:max-w-none" />
          </div>
          <div className="navbar-end shrink-0 flex-nowrap gap-1">
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
        </header>
        <main className="container mx-auto p-4 sm:p-6 max-w-full min-w-0 flex-1 max-w-md mx-auto text-center">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h1 className="card-title text-xl justify-center text-success">{t('orderSuccess')}</h1>
              <p className="font-mono font-bold">{t('orderNumberLabel')}: {orderNumber}</p>
              <p className="text-sm opacity-80">
                {isGuest ? 'Un récapitulatif a été envoyé à votre email.' : ''}
              </p>
              <Link href="/catalog" className="btn btn-primary mt-4">{t('catalog')}</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const subtotal = product.price * qty;
  const shippingAmount = 2000;
  const total = subtotal + shippingAmount;

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <header className="navbar bg-base-100 px-2 sm:px-4 min-h-12 py-1 gap-1 flex-nowrap overflow-x-hidden w-full max-w-full">
        <div className="navbar-start shrink-0 min-w-0 max-w-[50%]">
          <AppLogo className="btn btn-ghost btn-sm px-1 truncate max-w-[130px] sm:max-w-none" />
        </div>
        <div className="navbar-end shrink-0 flex-nowrap gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 max-w-full min-w-0 flex-1 max-w-lg">
        <h1 className="text-2xl font-bold mb-4 break-words">{t('checkoutTitle')}</h1>
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body p-4 sm:p-6">
            <p className="font-semibold break-words">{product.name}</p>
            <p className="text-primary font-bold">{product.price.toLocaleString()} × {qty} = {subtotal.toLocaleString()} XOF</p>
            <p className="text-sm opacity-80">+ {shippingAmount.toLocaleString()} XOF {t('shipping')}</p>
            <p className="font-bold">{t('total')}: {total.toLocaleString()} XOF</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            {isGuest && (
              <>
                <h2 className="font-semibold text-lg">{t('guestCheckout')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={t('firstName')}
                    className="input input-bordered min-w-0"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value.slice(0, 100))}
                    maxLength={100}
                  />
                  <input
                    type="text"
                    placeholder={t('lastName')}
                    className="input input-bordered min-w-0"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.slice(0, 100))}
                    maxLength={100}
                  />
                </div>
                <input
                  type="email"
                  placeholder={t('email')}
                  className="input input-bordered w-full min-w-0"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.slice(0, 255))}
                  required={isGuest}
                  maxLength={255}
                />
              </>
            )}
            <h2 className="font-semibold text-lg mt-2">{t('shippingAddress')}</h2>
            <input
              type="text"
              placeholder={t('address')}
              className="input input-bordered w-full min-w-0"
              value={address}
              onChange={(e) => setAddress(e.target.value.slice(0, 300))}
              required
              maxLength={300}
            />
            <input
              type="text"
              placeholder={t('city')}
              className="input input-bordered w-full min-w-0"
              value={city}
              onChange={(e) => setCity(e.target.value.slice(0, 100))}
              required
              maxLength={100}
            />
            <input
              type="tel"
              placeholder={t('phone')}
              className="input input-bordered w-full min-w-0"
              value={phone}
              onChange={(e) => setPhone(e.target.value.slice(0, 20))}
              maxLength={20}
            />
            {error && <div className="alert alert-error text-sm break-words">{error}</div>}
            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? '...' : t('confirmOrder')}
            </button>
          </div>
        </form>
        <p className="text-sm mt-4 text-center">
          <Link href="/catalog" className="link">← {t('catalog')}</Link>
        </p>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-200 flex items-center justify-center"><span className="loading loading-spinner" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
