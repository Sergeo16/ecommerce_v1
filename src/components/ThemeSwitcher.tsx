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
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-1 px-2 sm:px-3 min-w-0 shrink-0">
        <span className="opacity-70 shrink-0" aria-hidden>🎨</span>
        <span className="hidden lg:inline">{t('theme')}</span>
        <span className="hidden lg:inline text-xs opacity-80 truncate max-w-[5rem]">({theme})</span>
      </label>
      <ul tabIndex={0} className="dropdown-content menu z-[110] p-2 shadow-xl bg-base-100 border border-base-300 rounded-box w-52 mt-2">
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
