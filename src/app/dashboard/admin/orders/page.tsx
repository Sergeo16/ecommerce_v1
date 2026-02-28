'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

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

export default function AdminOrdersPage() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && orders.length === 0 && (
        <p className="text-center text-base-content/70">Aucune commande</p>
      )}
    </div>
  );
}
