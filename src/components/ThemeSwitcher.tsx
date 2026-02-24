'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !document.getElementById('theme-dropdown-portal')?.contains(target)) setOpen(false);
    }
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  const dropdown = open && typeof document !== 'undefined' && createPortal(
    <ul
      id="theme-dropdown-portal"
      className="fixed z-[200] p-2 shadow-xl bg-base-100 border border-base-300 rounded-box w-52 menu"
      role="menu"
      style={{ top: position.top, right: position.right, left: 'auto' }}
    >
      {THEMES.map(({ value, labelKey }) => (
        <li key={value} role="none">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setTheme(value);
              setOpen(false);
            }}
            className={theme === value ? 'active' : ''}
          >
            {t(labelKey)}
          </button>
        </li>
      ))}
    </ul>,
    document.body
  );

  return (
    <>
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-1 px-2 sm:px-3 min-w-0 shrink-0"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={t('theme')}
        >
          <span className="opacity-70 shrink-0" aria-hidden>🎨</span>
          <span className="hidden lg:inline">{t('theme')}</span>
          <span className="hidden lg:inline text-xs opacity-80 truncate max-w-[5rem]">({theme})</span>
        </button>
      </div>
      {dropdown}
    </>
  );
}
