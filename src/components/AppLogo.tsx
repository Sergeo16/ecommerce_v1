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
      {/* Représentation marketplace : icône SVG dont la couleur suit le thème (text-primary) */}
      <span aria-hidden className="text-primary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 5h2l1.2 9.2A1.5 1.5 0 0 0 7.7 16h9.6a1.5 1.5 0 0 0 1.47-1.2L20 8H7.2" />
          <circle cx="9" cy="19" r="1.3" />
          <circle cx="17" cy="19" r="1.3" />
          <path d="M10 8.5 11.5 5 13 8.5" />
          <path d="M14.5 8.5 16 5 17.5 8.5" />
        </svg>
      </span>
      {/* Texte "Centre Commercial ..." : masqué sur très petit écran pour éviter le chevauchement */}
      <span className="hidden sm:inline">
        {t('appName')}
      </span>
    </Link>
  );
}
