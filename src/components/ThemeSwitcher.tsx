'use client';

import { useTheme } from '@/components/ThemeProvider';
import { useLocale } from '@/context/LocaleContext';

const THEMES = [
  { value: 'dark' as const, labelKey: 'themeDark' as const },
  { value: 'business' as const, labelKey: 'themeBusiness' as const },
  { value: 'corporate' as const, labelKey: 'themeCorporate' as const },
  { value: 'luxury' as const, labelKey: 'themeLuxury' as const },
  { value: 'cyberpunk' as const, labelKey: 'themeCyberpunk' as const },
] as const;

export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-1">
        <span className="opacity-70">🎨</span>
        <span className="hidden sm:inline">{t('theme')}</span>
        <span className="text-xs opacity-80">({theme})</span>
      </label>
      <ul tabIndex={0} className="dropdown-content menu z-50 p-2 shadow-lg bg-base-200 rounded-box w-52 mt-2">
        {THEMES.map(({ value, labelKey }) => (
          <li key={value}>
            <button
              type="button"
              onClick={() => setTheme(value)}
              className={theme === value ? 'active' : ''}
            >
              {t(labelKey)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
