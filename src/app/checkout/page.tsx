'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { CartLink } from '@/components/CartLink';
import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';
import { usePaymentRules, type PaymentRules } from '@/hooks/usePaymentRules';
import {
  CANONICAL_CURRENCY,
  PAYMENT_ACCEPTED_CURRENCIES,
  isPaymentAcceptedCurrency,
  convertToXOF,
} from '@/lib/currency';
import { useShippingFee } from '@/hooks/useShippingFee';

type ProductInfo = { id: string; name: string; price: number; currency: string; companyProfileId?: string };
type PaymentMode = 'FULL_UPFRONT' | 'PARTIAL_ADVANCE' | 'PAY_ON_DELIVERY';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const { t } = useLocale();
  const { items: cartItems, clearCart } = useCart();
  const productId = searchParams.get('productId');
  const qtyFromUrl = Math.max(1, Math.min(999, parseInt(searchParams.get('qty') ?? '1', 10)));

  const fromCart = !productId && cartItems.length > 0;
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
  /** Utilisateur accepte de payer en devise acceptée (XOF) après conversion quand la devise du produit ne l'est pas. */
  const [conversionAccepted, setConversionAccepted] = useState(false);

  const firstProductId = productId ?? cartItems[0]?.productId;
  const companyId = fromCart ? cartItems[0]?.companyProfileId : product?.companyProfileId;
  const productCurrency = fromCart ? (cartItems[0]?.currency ?? CANONICAL_CURRENCY) : (product?.currency ?? CANONICAL_CURRENCY);
  const paymentRules = usePaymentRules(firstProductId ? { productId: firstProductId } : undefined);
  const shippingFee = useShippingFee(companyId ? { companyId, currency: productCurrency } : undefined);

  useEffect(() => {
    const curr = fromCart ? (cartItems[0]?.currency ?? CANONICAL_CURRENCY) : (product?.currency ?? CANONICAL_CURRENCY);
    const requiresPayment = paymentMode === 'FULL_UPFRONT' || paymentMode === 'PARTIAL_ADVANCE';
    if (!requiresPayment || isPaymentAcceptedCurrency(curr)) {
      setConversionAccepted(false);
    }
  }, [product, paymentMode, fromCart, cartItems]);

  useEffect(() => {
    if (fromCart) {
      setProduct(null);
      setLoading(false);
      return;
    }
    if (!productId) {
      setLoading(false);
      return;
    }
    fetch(`/api/products/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) =>
        p && setProduct({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          currency: String(p.currency ?? CANONICAL_CURRENCY).trim().toUpperCase(),
          companyProfileId: p.companyProfileId,
        })
      )
      .finally(() => setLoading(false));
  }, [productId, fromCart]);

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
    const items = fromCart
      ? cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      : productId && product ? [{ productId, quantity }] : [];
    if (items.length === 0) return;
    const curr = fromCart ? (cartItems[0]?.currency ?? CANONICAL_CURRENCY) : (product?.currency ?? CANONICAL_CURRENCY);
    const requiresPayment = paymentMode === 'FULL_UPFRONT' || paymentMode === 'PARTIAL_ADVANCE';
    const needsConversion =
      requiresPayment && !isPaymentAcceptedCurrency(curr);
    if (needsConversion && !conversionAccepted) {
      setError(t('acceptConversion').replace('{currency}', PAYMENT_ACCEPTED_CURRENCIES[0] ?? 'XOF'));
      return;
    }
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
        items,
        shippingAddress: ship,
        paymentMode,
        currency: needsConversion ? CANONICAL_CURRENCY : curr,
      };
      if (paymentMode === 'PARTIAL_ADVANCE') {
        body.advancePercent = (rulesOverride?.minAdvancePercent ?? 30);
      }
      if (needsConversion) {
        const cartSubtotal = fromCart ? cartItems.reduce((s, i) => s + i.price * i.quantity, 0) : product!.price * quantity;
        const subtotalXOF = Math.round(convertToXOF(cartSubtotal, curr));
        body.subtotal = subtotalXOF;
        body.shippingAmount = shippingXOF;
        body.total = subtotalXOF + shippingXOF;
      }
      if (isGuest) {
        body.guestEmail = email.trim();
        body.guestFirstName = firstName.trim().slice(0, 100) || null;
        body.guestLastName = lastName.trim().slice(0, 100) || null;
      }
      const res = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) });
      const text = await res.text();
      let data: { error?: string; order?: { orderNumber?: string } } = {};
      try {
        if (text) data = JSON.parse(text);
      } catch {
        data = { error: 'Réponse serveur invalide' };
      }
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      setOrderNumber(data.order?.orderNumber ?? null);
      if (fromCart) clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  const hasCheckoutItems = fromCart || (productId && product);
  if (loading && !fromCart) {
    return (
      <div className="min-h-screen bg-base-200 flex flex-col">
        <header className="navbar bg-base-100 px-2 sm:px-4 min-h-12 py-1 gap-1 flex-nowrap overflow-x-hidden w-full max-w-full">
          <div className="navbar-start shrink-0 min-w-0 max-w-[50%]">
            <AppLogo className="btn btn-ghost btn-sm px-1 truncate max-w-[130px] sm:max-w-none" />
          </div>
          <div className="navbar-end shrink-0 flex-nowrap gap-1">
            <CartLink />
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
        </header>
        <main className="container mx-auto p-4 sm:p-6 max-w-full min-w-0 flex-1">
          <span className="loading loading-spinner mx-auto block w-10" />
        </main>
      </div>
    );
  }
  if (!hasCheckoutItems) {
    return (
      <div className="min-h-screen bg-base-200 flex flex-col">
        <header className="navbar bg-base-100 px-2 sm:px-4 min-h-12 py-1 gap-1 flex-nowrap overflow-x-hidden w-full max-w-full">
          <div className="navbar-start shrink-0 min-w-0 max-w-[50%]">
            <AppLogo className="btn btn-ghost btn-sm px-1 truncate max-w-[130px] sm:max-w-none" />
          </div>
          <div className="navbar-end shrink-0 flex-nowrap gap-1">
            <CartLink />
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
        </header>
        <main className="container mx-auto p-4 sm:p-6 max-w-full min-w-0 flex-1 flex flex-col items-center justify-center">
          <div className="card bg-base-100 shadow-xl max-w-md w-full">
            <div className="card-body text-center">
              <h1 className="text-xl font-bold">{t('noProduct')}</h1>
              <p className="text-base-content/70">{t('cartEmptyDesc')}</p>
              <div className="flex gap-2 justify-center mt-4">
                <Link href="/cart" className="btn btn-outline">{t('cart')}</Link>
                <Link href="/catalog" className="btn btn-primary">{t('catalog')}</Link>
              </div>
            </div>
          </div>
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
            <CartLink />
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

  const subtotal = fromCart ? cartItems.reduce((s, i) => s + i.price * i.quantity, 0) : product!.price * quantity;
  const shippingAmount = shippingFee?.amountInCurrency ?? 0;
  const total = subtotal + shippingAmount;
  const needsConversion =
    (paymentMode === 'FULL_UPFRONT' || paymentMode === 'PARTIAL_ADVANCE') &&
    !isPaymentAcceptedCurrency(productCurrency);
  const subtotalXOF = needsConversion ? Math.round(convertToXOF(subtotal, productCurrency)) : 0;
  const shippingXOF = shippingFee?.amountXOF ?? 0;
  const totalXOF = needsConversion ? subtotalXOF + shippingXOF : 0;
  const advanceXOF =
    needsConversion && paymentMode === 'PARTIAL_ADVANCE'
      ? Math.round((totalXOF * (rulesOverride?.minAdvancePercent ?? 30)) / 100)
      : needsConversion && paymentMode === 'FULL_UPFRONT'
        ? totalXOF
        : 0;

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <header className="navbar bg-base-100 px-2 sm:px-4 min-h-12 py-1 gap-1 flex-nowrap overflow-x-hidden w-full max-w-full">
        <div className="navbar-start shrink-0 min-w-0 max-w-[50%]">
          <AppLogo className="btn btn-ghost btn-sm px-1 truncate max-w-[130px] sm:max-w-none" />
        </div>
        <div className="navbar-end shrink-0 flex-nowrap gap-1">
          <CartLink />
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 max-w-full min-w-0 flex-1 max-w-lg">
        <h1 className="text-2xl font-bold mb-4 break-words">{t('checkoutTitle')}</h1>
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body p-4 sm:p-6">
            {fromCart ? (
              <ul className="space-y-2">
                {cartItems.map((i) => (
                  <li key={i.productId} className="flex justify-between items-center gap-2 py-1 border-b border-base-300 last:border-0">
                    <span className="font-medium break-words">{i.name}</span>
                    <span className="text-primary font-bold shrink-0">{i.price.toLocaleString('fr-FR')} × {i.quantity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="font-semibold break-words">{product!.name}</p>
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
                <p className="text-primary font-bold mt-2">{product!.price.toLocaleString('fr-FR')} × {quantity} = {subtotal.toLocaleString('fr-FR')} {productCurrency}</p>
              </>
            )}
            <p className="text-sm opacity-80">+ {shippingAmount.toLocaleString('fr-FR')} {productCurrency} {t('shipping')}</p>
            <p className="font-bold">{t('total')}: {total.toLocaleString('fr-FR')} {productCurrency}</p>
          </div>
        </div>
        {needsConversion && (
          <div className="alert alert-warning mb-4 text-sm">
            <span>{t('paymentCurrencyNotSupported').replace('{currency}', productCurrency)}</span>
            <p className="mt-2 font-medium">{t('payInAcceptedCurrency').replace('{currency}', PAYMENT_ACCEPTED_CURRENCIES[0] ?? 'XOF')}</p>
            <p className="mt-1 opacity-90">{t('convertedAmount')}: {totalXOF.toLocaleString('fr-FR')} XOF</p>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={conversionAccepted}
                onChange={(e) => setConversionAccepted(e.target.checked)}
              />
              <span>{t('acceptConversion').replace('{currency}', PAYMENT_ACCEPTED_CURRENCIES[0] ?? 'XOF')}</span>
            </label>
          </div>
        )}
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
                          {t('total')}: {total.toLocaleString('fr-FR')} {productCurrency}
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
                          {rulesOverride.minAdvancePercent}% {t('minAdvancePercent')} {needsConversion
                            ? `${Math.round((totalXOF * rulesOverride.minAdvancePercent) / 100).toLocaleString('fr-FR')} XOF`
                            : `${(total * rulesOverride.minAdvancePercent / 100).toLocaleString('fr-FR')} ${productCurrency}`}
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
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={submitting || (needsConversion && !conversionAccepted)}
            >
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
