'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';
import { sanitizeName, sanitizePhone, validatePhone, LIMITS } from '@/lib/validate-fields';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestEmail?: string | null;
  companyProfile?: { companyName: string };
  items?: { product: { name: string }; quantity: number }[];
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  shippingAddress: {
    address?: string;
    city?: string;
    phone?: string;
    lat?: number;
    lng?: number;
  };
  user?: { firstName: string; lastName: string; email: string; phone: string | null };
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestEmail?: string | null;
  companyProfile?: {
    companyName: string;
    address: string | null;
    city: string | null;
    addressLat: number | null;
    addressLng: number | null;
    user?: { firstName: string; lastName: string; email: string; phone: string | null };
  };
  items: { product: { name: string }; quantity: number }[];
  delivery?: {
    id: string;
    status: string;
    courier?: { firstName: string; lastName: string; phone: string | null };
    externalCourierName: string | null;
    externalCourierPhone: string | null;
  } | null;
};

type CourierOption = { id: string; label: string; email: string; phone: string | null };

export default function AdminOrdersPage() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deliveryModalOrderId, setDeliveryModalOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [assignMode, setAssignMode] = useState<'platform' | 'external'>('platform');
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalPhone, setExternalPhone] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    fetch('/api/orders?limit=50', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  const openDeliveryModal = useCallback(
    (orderId: string) => {
      setDeliveryModalOrderId(orderId);
      setOrderDetail(null);
      setCouriers([]);
      setAssignError('');
      setAssignMode('platform');
      setSelectedCourierId('');
      setExternalName('');
      setExternalPhone('');
      if (!token) return;
      Promise.all([
        fetch(`/api/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/admin/couriers', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]).then(([orderData, couriersData]) => {
        setOrderDetail(orderData.error ? null : orderData);
        setCouriers(couriersData.couriers ?? []);
        if (couriersData.couriers?.length) setSelectedCourierId(couriersData.couriers[0].id);
      });
    },
    [token]
  );

  const closeDeliveryModal = useCallback(() => {
    setDeliveryModalOrderId(null);
    setOrderDetail(null);
  }, []);

  const handleAssignDelivery = useCallback(async () => {
    if (!deliveryModalOrderId || !token) return;
    setAssignError('');
    setAssignSubmitting(true);
    const body: { orderId: string; courierId?: string; externalCourierName?: string; externalCourierPhone?: string } = {
      orderId: deliveryModalOrderId,
    };
    if (assignMode === 'platform') {
      if (!selectedCourierId) {
        setAssignError('Choisissez un livreur de la plateforme.');
        setAssignSubmitting(false);
        return;
      }
      body.courierId = selectedCourierId;
    } else {
      const name = sanitizeName(externalName, LIMITS.name);
      const phone = sanitizePhone(externalPhone);
      if (!name || !phone) {
        setAssignError('Nom et téléphone du contact externe requis.');
        setAssignSubmitting(false);
        return;
      }
      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.ok) {
        setAssignError(phoneCheck.message ?? 'Téléphone invalide.');
        setAssignSubmitting(false);
        return;
      }
      body.externalCourierName = name;
      body.externalCourierPhone = phone;
    }
    try {
      const res = await fetch('/api/admin/deliveries/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssignError(data.error ?? 'Erreur');
        return;
      }
      closeDeliveryModal();
    } finally {
      setAssignSubmitting(false);
    }
  }, [deliveryModalOrderId, token, assignMode, selectedCourierId, externalName, externalPhone, closeDeliveryModal]);

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8">
        <p>{t('accessReservedAdmin')}</p>
        <Link href="/dashboard" className="btn btn-ghost mt-4">{t('back')}</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AppLogo className="btn btn-ghost btn-sm text-base" />
          <Link href="/dashboard" className="btn btn-ghost btn-sm">← {t('dashboard')}</Link>
        </div>
        <div className="flex gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-6">Commandes</h1>
      {loading ? (
        <span className="loading loading-spinner" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>N°</th>
                <th>Client</th>
                <th>Fournisseur</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Livraison</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  id={highlightId === o.id ? 'highlight' : undefined}
                  className={highlightId === o.id ? 'bg-primary/10' : ''}
                >
                  <td className="font-mono">{o.orderNumber}</td>
                  <td>
                    {o.user
                      ? `${o.user.firstName} ${o.user.lastName}`
                      : [o.guestFirstName, o.guestLastName].filter(Boolean).join(' ') || o.guestEmail || 'Invité'}
                  </td>
                  <td>{o.companyProfile?.companyName ?? '-'}</td>
                  <td>{Number(o.total).toLocaleString('fr-FR')} {o.currency}</td>
                  <td>
                    <span className="badge badge-ghost">{o.status}</span>
                  </td>
                  <td className="text-sm opacity-80">
                    {new Date(o.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openDeliveryModal(o.id)}
                    >
                      Confier livraison
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && orders.length === 0 && (
        <p className="text-center text-base-content/70">Aucune commande</p>
      )}

      {deliveryModalOrderId && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg">Confier la livraison</h3>
            {!orderDetail ? (
              <span className="loading loading-spinner my-4" />
            ) : (
              <>
                <div className="text-sm space-y-2 my-4 p-3 bg-base-200 rounded-lg">
                  <p><strong>Commande :</strong> {orderDetail.orderNumber}</p>
                  <p><strong>Client :</strong> {orderDetail.user ? `${orderDetail.user.firstName} ${orderDetail.user.lastName}` : [orderDetail.guestFirstName, orderDetail.guestLastName].filter(Boolean).join(' ') || orderDetail.guestEmail || 'Invité'}
                    {orderDetail.user?.email || orderDetail.guestEmail ? ` — ${orderDetail.user?.email || orderDetail.guestEmail}` : ''}
                    {orderDetail.shippingAddress?.phone ? ` — Tél: ${String(orderDetail.shippingAddress.phone)}` : ''}
                  </p>
                  <p><strong>Adresse livraison (client) :</strong> {[orderDetail.shippingAddress?.address, orderDetail.shippingAddress?.city].filter(Boolean).join(', ') || '—'}
                    {(orderDetail.shippingAddress?.lat != null && orderDetail.shippingAddress?.lng != null) && (
                      <span> — GPS: {Number(orderDetail.shippingAddress.lat)}, {Number(orderDetail.shippingAddress.lng)}</span>
                    )}
                  </p>
                  <p><strong>Fournisseur :</strong> {orderDetail.companyProfile?.companyName ?? '-'}
                    {orderDetail.companyProfile?.address || orderDetail.companyProfile?.city ? ` — Adresse: ${[orderDetail.companyProfile?.address, orderDetail.companyProfile?.city].filter(Boolean).join(', ') || '—'}` : ''}
                    {orderDetail.companyProfile?.addressLat != null && orderDetail.companyProfile?.addressLng != null && (
                      <span> — GPS: {Number(orderDetail.companyProfile.addressLat)}, {Number(orderDetail.companyProfile.addressLng)}</span>
                    )}
                    {orderDetail.companyProfile?.user?.phone ? ` — Tél: ${orderDetail.companyProfile.user.phone}` : ''}
                    {orderDetail.companyProfile?.user?.email ? ` — ${orderDetail.companyProfile.user.email}` : ''}
                  </p>
                  <p><strong>Articles :</strong> {orderDetail.items?.map((i) => `${i.product.name} × ${i.quantity}`).join(', ') ?? '—'}</p>
                  <p><strong>Total :</strong> {Number(orderDetail.total).toLocaleString('fr-FR')} {orderDetail.currency}</p>
                  {orderDetail.delivery && (orderDetail.delivery.courier || orderDetail.delivery.externalCourierName) && (
                    <p className="text-primary"><strong>Déjà assigné :</strong> {orderDetail.delivery.courier ? `${orderDetail.delivery.courier.firstName} ${orderDetail.delivery.courier.lastName}` : `${orderDetail.delivery.externalCourierName} (${orderDetail.delivery.externalCourierPhone})`}</p>
                  )}
                </div>
                <div className="divider" />
                <p className="font-medium mb-2">Choisir le livreur</p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignMode"
                      className="radio radio-sm"
                      checked={assignMode === 'platform'}
                      onChange={() => setAssignMode('platform')}
                    />
                    <span>Livreur de la plateforme</span>
                  </label>
                  {assignMode === 'platform' && (
                    <select
                      className="select select-bordered w-full max-w-md"
                      value={selectedCourierId}
                      onChange={(e) => setSelectedCourierId(e.target.value)}
                    >
                      {couriers.length === 0 ? (
                        <option value="">Aucun livreur enregistré</option>
                      ) : (
                        couriers.map((c) => (
                          <option key={c.id} value={c.id}>{c.label} {c.phone ? ` — ${c.phone}` : ''}</option>
                        ))
                      )}
                    </select>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignMode"
                      className="radio radio-sm"
                      checked={assignMode === 'external'}
                      onChange={() => setAssignMode('external')}
                    />
                    <span>Autre (contact externe)</span>
                  </label>
                  {assignMode === 'external' && (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Nom du contact"
                        className="input input-bordered flex-1 min-w-[140px]"
                        value={externalName}
                        onChange={(e) => setExternalName(sanitizeName(e.target.value, LIMITS.name))}
                        maxLength={LIMITS.name}
                      />
                      <input
                        type="tel"
                        placeholder="Téléphone"
                        className="input input-bordered flex-1 min-w-[140px]"
                        value={externalPhone}
                        onChange={(e) => setExternalPhone(sanitizePhone(e.target.value))}
                        maxLength={LIMITS.phone}
                      />
                    </div>
                  )}
                </div>
                {assignError && <p className="text-error text-sm mt-2">{assignError}</p>}
              </>
            )}
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closeDeliveryModal}>Fermer</button>
              {orderDetail && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={assignSubmitting || (assignMode === 'platform' && !selectedCourierId) || (assignMode === 'external' && (!externalName.trim() || !externalPhone.trim()))}
                  onClick={handleAssignDelivery}
                >
                  {assignSubmitting ? 'Envoi…' : 'Confier la livraison'}
                </button>
              )}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={closeDeliveryModal}>fermer</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
