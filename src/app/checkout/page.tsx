'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';
import { usePaymentRules, type PaymentRules } from '@/hooks/usePaymentRules';

type ProductInfo = { id: string; name: string; price: number };
type PaymentMode = 'FULL_UPFRONT' | 'PARTIAL_ADVANCE' | 'PAY_ON_DELIVERY';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const { t } = useLocale();
  const productId = searchParams.get('productId');
  const qtyFromUrl = Math.max(1, Math.min(999, parseInt(searchParams.get('qty') ?? '1', 10)));

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [quantity, setQuantity] = useState(qtyFromUrl);
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
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('FULL_UPFRONT');
  const [rulesOverride, setRulesOverride] = useState<PaymentRules | null>(null);

  const paymentRules = usePaymentRules(productId ? { productId } : undefined);

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

  useEffect(() => {
    if (!paymentRules) return;
    setRulesOverride(paymentRules);
    const available: PaymentMode[] = [];
    if (paymentRules.fullUpfront) available.push('FULL_UPFRONT');
    if (paymentRules.partialAdvance) available.push('PARTIAL_ADVANCE');
    if (paymentRules.payOnDelivery) available.push('PAY_ON_DELIVERY');
    if (available.length === 0) {
      setPaymentMode('FULL_UPFRONT');
      return;
    }
    setPaymentMode((prev) => (available.includes(prev) ? prev : available[0]));
  }, [paymentRules]);

  const isGuest = !user;

  // Pré-remplir le téléphone de l'utilisateur connecté avec la valeur fournie lors de l'inscription (s'il existe),
  // tout en laissant le champ librement modifiable.
  useEffect(() => {
    if (!user || !token) return;
    if (phone.trim()) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const fromProfile = (data?.phone ?? '').toString().trim();
        if (!cancelled && fromProfile && !phone.trim()) {
          setPhone(fromProfile.slice(0, 20));
        }
      } catch {
        // en cas d'erreur, on n'empêche pas l'utilisateur de saisir son téléphone manuellement
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, token, phone]);

  const handleQuantityChange = (value: number) => {
    const q = Math.max(1, Math.min(999, value));
    setQuantity(q);
  };

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationError(t('locationError'));
      return;
    }
    setLocationError(null);
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocationCoords({ lat, lng });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'fr,en', 'User-Agent': 'AfricaMarketplace-Checkout/1.0' } }
          );
          const data = await res.json();
          if (data?.address) {
            const a = data.address;
            const parts = [a.road, a.house_number, a.street, a.village, a.town, a.city, a.state].filter(Boolean);
            setAddress(parts.slice(0, 3).join(', ') || data.display_name?.slice(0, 300) || '');
            setCity([a.city, a.town, a.village, a.municipality, a.state].find(Boolean) || '');
          }
          setLocationError(null);
        } catch {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setLocationError(null);
        }
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        setLocationError(err.code === 1 ? t('locationDenied') : t('locationError'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!productId || !product) return;
    const ship: Record<string, unknown> = {
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim() || undefined,
    };
    if (locationCoords) {
      ship.lat = locationCoords.lat;
      ship.lng = locationCoords.lng;
    }
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
        items: [{ productId, quantity }],
        shippingAddress: ship,
        paymentMode,
      };
      if (paymentMode === 'PARTIAL_ADVANCE') {
        body.advancePercent = (rulesOverride?.minAdvancePercent ?? 30);
      }
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

  const subtotal = product.price * quantity;
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
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('quantity')}:</span>
                <div className="join">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline join-item"
                    onClick={() => handleQuantityChange(quantity - 1)}
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
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline join-item"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    aria-label="+"
                  >
                    +
                  </button>
                </div>
              </label>
            </div>
            <p className="text-primary font-bold mt-2">{product.price.toLocaleString()} × {quantity} = {subtotal.toLocaleString()} XOF</p>
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
            <h2 className="font-semibold text-lg mt-2">{t('paymentModes')}</h2>
            <div className="space-y-2 text-sm">
              {!rulesOverride && (
                <p className="opacity-70">{t('loading')}</p>
              )}
              {rulesOverride && (
                <>
                  {rulesOverride.fullUpfront && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        className="radio radio-primary mt-1"
                        checked={paymentMode === 'FULL_UPFRONT'}
                        onChange={() => setPaymentMode('FULL_UPFRONT')}
                      />
                      <span>
                        <span className="font-medium">{t('fullUpfront')}</span>
                        <span className="block text-xs opacity-70">
                          {t('total')}: {total.toLocaleString()} XOF
                        </span>
                      </span>
                    </label>
                  )}
                  {rulesOverride.partialAdvance && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        className="radio radio-primary mt-1"
                        checked={paymentMode === 'PARTIAL_ADVANCE'}
                        onChange={() => setPaymentMode('PARTIAL_ADVANCE')}
                      />
                      <span>
                        <span className="font-medium">{t('partialAdvance')}</span>
                        <span className="block text-xs opacity-70">
                          {rulesOverride.minAdvancePercent}% {t('minAdvancePercent')} ≈{' '}
                          {Math.round((total * rulesOverride.minAdvancePercent) / 100).toLocaleString()} XOF
                        </span>
                      </span>
                    </label>
                  )}
                  {rulesOverride.payOnDelivery && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        className="radio radio-primary mt-1"
                        checked={paymentMode === 'PAY_ON_DELIVERY'}
                        onChange={() => setPaymentMode('PAY_ON_DELIVERY')}
                      />
                      <span>
                        <span className="font-medium">{t('payOnDelivery')}</span>
                        <span className="block text-xs opacity-70">
                          {t('shippingAddress')}
                        </span>
                      </span>
                    </label>
                  )}
                </>
              )}
            </div>
            <h2 className="font-semibold text-lg mt-4">{t('shippingAddress')}</h2>
            <div className="flex flex-wrap gap-2 items-start">
              <input
                type="text"
                placeholder={t('address')}
                className="input input-bordered flex-1 min-w-0"
                value={address}
                onChange={(e) => setAddress(e.target.value.slice(0, 300))}
                required
                maxLength={300}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm gap-1 shrink-0"
                onClick={handleUseMyLocation}
                disabled={locationLoading}
                title={t('useMyLocation')}
              >
                {locationLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <span aria-hidden>📍</span>
                )}
                <span className="hidden sm:inline">{t('useMyLocation')}</span>
              </button>
            </div>
            {locationCoords && (
              <p className="text-sm text-success flex items-center gap-1">
                <span aria-hidden>✓</span> {t('locationSuccess')}: {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)}
              </p>
            )}
            {locationError && (
              <p className="text-sm text-error">{locationError}</p>
            )}
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
