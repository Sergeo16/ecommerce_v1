'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

export default function HomePage() {
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <>
      {/* Navbar : une seule ligne sur tous les écrans (menu hamburger sur mobile) */}
      <header className="border-b border-base-300 bg-base-100/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm overflow-x-hidden w-full max-w-full">
        <div className="container mx-auto px-4 sm:px-5 w-full max-w-full min-w-0">
          <div className="navbar min-h-12 sm:min-h-14 py-0 gap-2 sm:gap-3 md:gap-4 flex-nowrap w-full max-w-full min-w-0">
            {/* Logo : marge à gauche, troncature sur petit écran */}
            <div className="navbar-start shrink-0 min-w-0 max-w-[40%] sm:max-w-none pl-0 pr-2">
              <AppLogo className="btn btn-ghost text-base sm:text-xl font-bold tracking-tight px-2 sm:px-3 py-2 normal-case hover:opacity-90 no-underline truncate max-w-[110px] sm:max-w-[180px] md:max-w-none" />
            </div>

            {/* Centre : liens (cachés sur mobile, dans le menu) */}
            <nav className="navbar-center flex-1 justify-center hidden md:flex flex-nowrap gap-4 lg:gap-6 min-w-0" aria-label="Navigation principale">
              <Link href="/catalog" className="link link-hover font-medium opacity-90 hover:opacity-100 whitespace-nowrap">
                {t('catalog')}
              </Link>
              <Link href="/auth/login" className="link link-hover font-medium opacity-90 hover:opacity-100 whitespace-nowrap">
                {t('login')}
              </Link>
              <Link href="/auth/register" className="link link-hover font-medium opacity-90 hover:opacity-100 whitespace-nowrap">
                {t('register')}
              </Link>
            </nav>

            {/* Droite : thème + langue + Dashboard — padding pour éviter débordement et chevauchement */}
            <div className="navbar-end shrink-0 flex-nowrap gap-2 sm:gap-3 pr-2 sm:pr-4 pl-2">
              <div className="hidden md:flex items-center flex-nowrap gap-2">
                <ThemeSwitcher />
                <LocaleSwitcher />
              </div>
              <Link href="/dashboard" className="btn btn-primary btn-sm sm:btn-md shadow-md hidden md:inline-flex whitespace-nowrap flex-shrink-0 px-3 sm:px-4 ml-0.5">
                {t('dashboard')}
              </Link>

              {/* Mobile : bouton menu */}
              <div className="md:hidden relative" ref={menuRef}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
                  aria-expanded={menuOpen}
                  aria-label="Menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {menuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-lg shadow-xl bg-base-100 border border-base-300 py-2 z-50">
                    <Link href="/catalog" className="block px-4 py-2 hover:bg-base-200" onClick={() => setMenuOpen(false)}>{t('catalog')}</Link>
                    <Link href="/auth/login" className="block px-4 py-2 hover:bg-base-200" onClick={() => setMenuOpen(false)}>{t('login')}</Link>
                    <Link href="/auth/register" className="block px-4 py-2 hover:bg-base-200" onClick={() => setMenuOpen(false)}>{t('register')}</Link>
                    <div className="border-t border-base-300 my-2" />
                    <div className="px-4 py-2 flex items-center gap-2">
                      <ThemeSwitcher />
                      <LocaleSwitcher />
                    </div>
                    <div className="px-4 pt-2">
                      <Link href="/dashboard" className="btn btn-primary btn-sm w-full" onClick={() => setMenuOpen(false)}>{t('dashboard')}</Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 sm:py-20 text-center max-w-full overflow-hidden">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight break-words">{t('heroTitle')}</h1>
        <p className="text-base sm:text-lg md:text-xl opacity-80 mb-8 sm:mb-10 max-w-2xl mx-auto break-words">{t('heroSubtitle')}</p>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <Link href="/catalog" className="btn btn-primary btn-lg shadow-lg w-full sm:w-auto">{t('seeCatalog')}</Link>
          <Link href="/auth/register?role=affiliate" className="btn btn-outline btn-lg w-full sm:w-auto">{t('becomeAffiliate')}</Link>
          <Link href="/auth/register?role=supplier" className="btn btn-outline btn-lg w-full sm:w-auto">{t('becomeSupplier')}</Link>
        </div>
      </main>
    </>
  );
}
