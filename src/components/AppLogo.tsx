'use client';

import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';

type AppLogoProps = {
  className?: string;
};

export function AppLogo({ className = 'btn btn-ghost text-xl' }: AppLogoProps) {
  const { t } = useLocale();
  return (
    <Link href="/" className={`whitespace-nowrap ${className}`} aria-label={t('appName')}>
      {t('appName')}
    </Link>
  );
}
