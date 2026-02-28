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
  const [deliveryTrackingEnabled, setDeliveryTrackingEnabled] = useState(true);
  const [supplierIdentityVisible, setSupplierIdentityVisible] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [notifPlatform, setNotifPlatform] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifWhatsApp, setNotifWhatsApp] = useState(false);
  const [notifEmailOverride, setNotifEmailOverride] = useState('');
  const [notifWhatsAppOverride, setNotifWhatsAppOverride] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    Promise.all([
      fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/admin/maintenance').then((r) => r.json()),
    ]).then(([data, maintenanceData]) => {
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
      const tracking = data.delivery_tracking_enabled;
      setDeliveryTrackingEnabled(tracking === false ? false : true);
      const supplierId = data.supplier_identity_visible;
      setSupplierIdentityVisible(supplierId === true);
      setMaintenanceMode((maintenanceData as { maintenance?: boolean }).maintenance === true);
      const ch = data.admin_notification_channels as { platform?: boolean; email?: boolean; whatsapp?: boolean } | undefined;
      setNotifPlatform(ch?.platform !== false);
      setNotifEmail(ch?.email === true);
      setNotifWhatsApp(ch?.whatsapp === true);
      setNotifEmailOverride(typeof data.admin_notification_email === 'string' ? data.admin_notification_email : '');
      setNotifWhatsAppOverride(typeof data.admin_notification_whatsapp_phone === 'string' ? data.admin_notification_whatsapp_phone : '');
    })
    .catch(() => setMessage('error'))
    .finally(() => setLoading(false));
  }, [token, user?.role]);

  async function setMaintenance(enabled: boolean) {
    if (!token) return;
    const res = await fetch('/api/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) setMaintenanceMode(enabled);
  }

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
      await putSetting('delivery_tracking_enabled', deliveryTrackingEnabled);
      await putSetting('supplier_identity_visible', supplierIdentityVisible);
      await putSetting('admin_notification_channels', {
        platform: notifPlatform,
        email: notifEmail,
        whatsapp: notifWhatsApp,
      });
      await putSetting('admin_notification_email', notifEmailOverride.trim() || '');
      await putSetting('admin_notification_whatsapp_phone', notifWhatsAppOverride.trim() || '');
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
            <h2 className="font-semibold text-lg mb-2">{t('maintenanceMode')}</h2>
            <p className="text-sm opacity-80 mb-3">{t('maintenanceModeDesc')}</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={maintenanceMode}
                onChange={(e) => setMaintenance(e.target.checked)}
              />
              <span>{maintenanceMode ? t('active') : t('suspended')}</span>
            </label>
          </div>
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

          <div className="bg-base-100 rounded-lg shadow p-4 sm:p-6">
            <h2 className="font-semibold text-lg mb-2">{t('deliveryTrackingEnabled')}</h2>
            <p className="text-sm opacity-80 mb-3">{t('deliveryTrackingEnabledDesc')}</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={deliveryTrackingEnabled}
                onChange={(e) => setDeliveryTrackingEnabled(e.target.checked)}
              />
              <span>{deliveryTrackingEnabled ? t('active') : t('suspended')}</span>
            </label>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-4 sm:p-6">
            <h2 className="font-semibold text-lg mb-2">{t('supplierIdentityVisible')}</h2>
            <p className="text-sm opacity-80 mb-3">{t('supplierIdentityVisibleDesc')}</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={supplierIdentityVisible}
                onChange={(e) => setSupplierIdentityVisible(e.target.checked)}
              />
              <span>{supplierIdentityVisible ? t('active') : t('suspended')}</span>
            </label>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-4 sm:p-6">
            <h2 className="font-semibold text-lg mb-2">{t('adminNotificationChannels')}</h2>
            <p className="text-sm opacity-80 mb-4">{t('adminNotificationChannelsDesc')}</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={notifPlatform}
                  onChange={(e) => setNotifPlatform(e.target.checked)}
                />
                <span>{t('adminNotificationPlatform')}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.checked)}
                />
                <span>{t('adminNotificationEmail')}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={notifWhatsApp}
                  onChange={(e) => setNotifWhatsApp(e.target.checked)}
                />
                <span>{t('adminNotificationWhatsApp')}</span>
              </label>
            </div>
            <div className="mt-4 space-y-2">
              <input
                type="email"
                placeholder={t('adminNotificationEmailOverride')}
                className="input input-bordered w-full max-w-md"
                value={notifEmailOverride}
                onChange={(e) => setNotifEmailOverride(e.target.value)}
              />
              <input
                type="tel"
                placeholder={t('adminNotificationWhatsAppOverride')}
                className="input input-bordered w-full max-w-md"
                value={notifWhatsAppOverride}
                onChange={(e) => setNotifWhatsAppOverride(e.target.value)}
              />
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
