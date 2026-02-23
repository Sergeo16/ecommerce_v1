'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

type PaymentModes = {
  fullUpfront?: boolean;
  partialAdvance?: boolean;
  payOnDelivery?: boolean;
  minAdvancePercent?: number;
};

const THEME_OPTIONS = ['business', 'corporate', 'luxury', 'cyberpunk', 'dark'] as const;

export default function AdminSettingsPage() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<'saved' | 'error' | null>(null);

  const [fullUpfront, setFullUpfront] = useState(true);
  const [partialAdvance, setPartialAdvance] = useState(true);
  const [payOnDelivery, setPayOnDelivery] = useState(true);
  const [minAdvancePercent, setMinAdvancePercent] = useState(30);
  const [platformCommissionPercent, setPlatformCommissionPercent] = useState(5);
  const [defaultTheme, setDefaultTheme] = useState('business');

  useEffect(() => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        const pm = (data.payment_modes as PaymentModes) ?? {};
        setFullUpfront(pm.fullUpfront ?? true);
        setPartialAdvance(pm.partialAdvance ?? true);
        setPayOnDelivery(pm.payOnDelivery ?? true);
        setMinAdvancePercent(typeof pm.minAdvancePercent === 'number' ? pm.minAdvancePercent : 30);
        const pct = data.platform_commission_percent ?? data.commission_rules;
        setPlatformCommissionPercent(
          typeof pct === 'number' ? pct : typeof pct === 'object' && pct && typeof (pct as { platformPercent?: number }).platformPercent === 'number'
            ? (pct as { platformPercent: number }).platformPercent
            : 5
        );
        setDefaultTheme(typeof data.theme === 'string' ? data.theme : 'business');
      })
      .catch(() => setMessage('error'))
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  async function putSetting(key: string, value: unknown) {
    if (!token) return;
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error('Save failed');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await putSetting('payment_modes', {
        fullUpfront,
        partialAdvance,
        payOnDelivery,
        minAdvancePercent,
      });
      await putSetting('platform_commission_percent', platformCommissionPercent);
      await putSetting('commission_rules', {
        platformPercent: platformCommissionPercent,
        maxAffiliatePercent: 30,
        courierFixed: 1500,
      });
      await putSetting('theme', defaultTheme);
      setMessage('saved');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage('error');
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8">
        <p>{t('accessReservedAdmin')}</p>
        <Link href="/dashboard" className="btn btn-ghost mt-4">{t('back')}</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
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
      <h1 className="text-2xl font-bold mb-6">{t('globalSettings')}</h1>

      {loading ? (
        <span className="loading loading-spinner" />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-base-100 rounded-lg shadow p-4 sm:p-6">
            <h2 className="font-semibold text-lg mb-4">{t('paymentModes')}</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={fullUpfront}
                  onChange={(e) => setFullUpfront(e.target.checked)}
                />
                <span>{t('fullUpfront')}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={partialAdvance}
                  onChange={(e) => setPartialAdvance(e.target.checked)}
                />
                <span>{t('partialAdvance')}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={payOnDelivery}
                  onChange={(e) => setPayOnDelivery(e.target.checked)}
                />
                <span>{t('payOnDelivery')}</span>
              </label>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('minAdvancePercent')}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input input-bordered w-24"
                  value={minAdvancePercent}
                  onChange={(e) => setMinAdvancePercent(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-4 sm:p-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('platformCommissionPercent')}</span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="input input-bordered w-24"
                value={platformCommissionPercent}
                onChange={(e) => setPlatformCommissionPercent(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-4 sm:p-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('defaultTheme')}</span>
              </label>
              <select
                className="select select-bordered w-full max-w-xs"
                value={defaultTheme}
                onChange={(e) => setDefaultTheme(e.target.value)}
              >
                {THEME_OPTIONS.map((th) => (
                  <option key={th} value={th}>{th}</option>
                ))}
              </select>
            </div>
          </div>

          {message === 'saved' && (
            <p className="text-success font-medium">{t('saved')}</p>
          )}
          {message === 'error' && (
            <p className="text-error">Erreur lors de l&apos;enregistrement.</p>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '...' : t('save')}
          </button>
        </form>
      )}
    </div>
  );
}
