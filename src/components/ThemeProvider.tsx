'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'business' | 'corporate' | 'luxury' | 'cyberpunk';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
} | null>(null);

const THEME_KEY = 'marketplace_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('business');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem(THEME_KEY)) as Theme | null;
    if (saved && ['dark', 'business', 'corporate', 'luxury', 'cyberpunk'].includes(saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'business');
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
