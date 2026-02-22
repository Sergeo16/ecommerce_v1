'use client';

import Link from 'next/link';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

export default function HomePage() {
  const { t } = useLocale();
  return (
    <>
      <div className="navbar bg-base-200 px-4">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl">{t('appName')}</Link>
        </div>
        <div className="navbar-center hidden lg:flex gap-4">
          <Link href="/catalog" className="link">{t('catalog')}</Link>
          <Link href="/auth/login" className="link">{t('login')}</Link>
          <Link href="/auth/register" className="link">{t('register')}</Link>
        </div>
        <div className="navbar-end gap-1">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <Link href="/dashboard" className="btn btn-primary">{t('dashboard')}</Link>
        </div>
      </div>
      <main className="container mx-auto py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">{t('heroTitle')}</h1>
        <p className="text-lg opacity-80 mb-8">{t('heroSubtitle')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/catalog" className="btn btn-primary btn-lg">{t('seeCatalog')}</Link>
          <Link href="/auth/register?role=affiliate" className="btn btn-outline btn-lg">{t('becomeAffiliate')}</Link>
          <Link href="/auth/register?role=supplier" className="btn btn-outline btn-lg">{t('becomeSupplier')}</Link>
        </div>
      </main>
    </>
  );
}
