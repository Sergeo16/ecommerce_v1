'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

export default function DashboardPage() {
  const { user, token, isLoading, logout } = useAuth();
  const { t } = useLocale();
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [affiliateStats, setAffiliateStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    if (user.role === 'SUPER_ADMIN') {
      fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then(setDashboard)
        .catch(() => setDashboard(null));
    }
    if (user.role === 'AFFILIATE') {
      fetch('/api/affiliate/stats', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then(setAffiliateStats)
        .catch(() => setAffiliateStats(null));
    }
  }, [token, user]);

  if (isLoading) return <div className="p-8">{t('loading')}</div>;
  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>{t('connectToAccessDashboard')}</p>
        <Link href="/auth/login" className="btn btn-primary mt-4">{t('login')}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 shadow-lg px-4">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl">{t('appName')}</Link>
        </div>
        <div className="navbar-center gap-4 flex">
          <Link href="/catalog" className="link">{t('catalog')}</Link>
          <Link href="/dashboard" className="link font-semibold">{t('dashboard')}</Link>
        </div>
        <div className="navbar-end gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <span className="text-sm opacity-80">{user.firstName} ({user.role})</span>
          <button type="button" onClick={logout} className="btn btn-ghost btn-sm">{t('logout')}</button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">{t('dashboardTitle')} — {user.role}</h1>

        {user.role === 'SUPER_ADMIN' && dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-title">{t('platformRevenue')}</div>
              <div className="stat-value text-primary">{(dashboard.revenue as number)?.toLocaleString()}</div>
            </div>
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-title">{t('platformCommissions')}</div>
              <div className="stat-value">{(dashboard.platformCommissions as number)?.toLocaleString()}</div>
            </div>
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-title">{t('pendingWithdrawals')}</div>
              <div className="stat-value">{(dashboard.pendingWithdrawals as number)?.toLocaleString()}</div>
            </div>
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-title">{t('deliveryRate')}</div>
              <div className="stat-value">{(dashboard.deliverySuccessRate as number)?.toFixed(1)}%</div>
            </div>
          </div>
        )}

        {user.role === 'AFFILIATE' && affiliateStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-title">{t('totalCommissions')}</div>
              <div className="stat-value text-primary">{(affiliateStats.totalCommissions as number)?.toLocaleString()}</div>
            </div>
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-title">{t('pending')}</div>
              <div className="stat-value">{(affiliateStats.pendingCommissions as number)?.toLocaleString()}</div>
            </div>
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-title">{t('ranking')}</div>
              <div className="stat-value">#{affiliateStats.ranking}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {user.role === 'SUPER_ADMIN' && (
            <>
              <Link href="/dashboard/admin/settings" className="btn btn-outline">{t('globalSettings')}</Link>
              <Link href="/dashboard/admin/users" className="btn btn-outline">{t('users')}</Link>
            </>
          )}
          {user.role === 'AFFILIATE' && (
            <>
              <Link href="/dashboard/affiliate/links" className="btn btn-primary">{t('myAffiliateLinks')}</Link>
              <Link href="/dashboard/affiliate/withdraw" className="btn btn-outline">{t('requestWithdrawal')}</Link>
            </>
          )}
          {user.role === 'SUPPLIER' && (
            <Link href="/dashboard/supplier/products" className="btn btn-primary">{t('myProducts')}</Link>
          )}
          {user.role === 'COURIER' && (
            <Link href="/dashboard/courier/missions" className="btn btn-primary">{t('myMissions')}</Link>
          )}
          {(user.role === 'CLIENT' || user.role === 'AFFILIATE') && (
            <Link href="/catalog" className="btn btn-primary">{t('seeCatalog')}</Link>
          )}
        </div>
      </main>
    </div>
  );
}
