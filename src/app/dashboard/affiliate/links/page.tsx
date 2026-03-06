'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

export default function AffiliateLinksPage() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const [links, setLinks] = useState<Array<{ id: string; slug: string; referralCode: string; trackingLink?: string; clickCount: number; conversionCount: number; product?: { name: string } }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'AFFILIATE') return;
    fetch('/api/affiliate/links', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(text || r.statusText);
        return text ? JSON.parse(text) : [];
      })
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  if (user?.role !== 'AFFILIATE') {
    return (
      <div className="p-8">
        <p>{t('accessReservedAffiliate')}</p>
        <Link href="/dashboard" className="btn btn-ghost mt-4">{t('back')}</Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AppLogo className="btn btn-ghost btn-sm text-base" />
          <Link href="/dashboard" className="btn btn-ghost btn-sm">← {t('dashboard')}</Link>
        </div>
        <div className="flex gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-6">{t('myAffiliateLinks')}</h1>
      {loading ? (
        <span className="loading loading-spinner" />
      ) : (
        <div className="space-y-4">
          {links.length === 0 ? (
            <p className="opacity-70">Aucun lien. Créez-en un via l’API POST /api/affiliate/links (productId optionnel).</p>
          ) : (
            links.map((link) => (
              <div key={link.id} className="card bg-base-100 shadow">
                <div className="card-body">
                  <p className="font-mono text-sm break-all">{link.trackingLink ?? `REF: ${link.referralCode}`}</p>
                  <p className="text-sm opacity-70">Clics: {link.clickCount} — Conversions: {link.conversionCount}</p>
                  {link.product && <p className="text-xs">Produit: {link.product.name}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
