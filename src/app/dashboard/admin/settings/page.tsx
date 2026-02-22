'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

export default function AdminSettingsPage() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setSettings)
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/dashboard" className="btn btn-ghost btn-sm">← {t('dashboard')}</Link>
        <div className="flex gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-6">{t('globalSettings')}</h1>
      {loading ? (
        <span className="loading loading-spinner" />
      ) : (
        <div className="bg-base-100 rounded-lg shadow p-6 max-w-2xl">
          <pre className="text-sm overflow-auto">{JSON.stringify(settings, null, 2)}</pre>
          <p className="text-sm opacity-70 mt-4">Modification via API PUT /api/admin/settings (key, value, group).</p>
        </div>
      )}
    </div>
  );
}
