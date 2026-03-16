'use client';

import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';

type AppLogoProps = {
  className?: string;
};

export function AppLogo({ className = 'btn btn-ghost text-xl' }: AppLogoProps) {
  const { t } = useLocale();
  return (
    <Link href="/" className={`whitespace-nowrap inline-flex items-center gap-1 ${className}`} aria-label={t('appName')}>
      {/* Représentation marketplace */}
      <span aria-hidden className="text-lg sm:text-xl">
        🛒
      </span>
      {/* Texte "Centre Commercial ..." : masqué sur très petit écran pour éviter le chevauchement */}
      <span className="hidden sm:inline">
        {t('appName')}
      </span>
    </Link>
  );
}
