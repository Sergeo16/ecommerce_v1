'use client';

import { useLocale } from '@/context/LocaleContext';
import type { Locale } from '@/lib/translations';

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-1">
        <span className="opacity-70">🌐</span>
        <span className="hidden sm:inline">{t('language')}</span>
        <span className="text-xs uppercase opacity-80">{locale}</span>
      </label>
      <ul tabIndex={0} className="dropdown-content menu z-50 p-2 shadow-lg bg-base-200 rounded-box w-40 mt-2">
        {LOCALES.map(({ value, label }) => (
          <li key={value}>
            <button
              type="button"
              onClick={() => setLocale(value)}
              className={locale === value ? 'active' : ''}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
