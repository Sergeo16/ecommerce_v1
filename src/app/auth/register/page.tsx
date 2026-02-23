'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLogo } from '@/components/AppLogo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/context/LocaleContext';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') ?? 'client';
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'AFFILIATE' | 'SUPPLIER' | 'COURIER'>(
    roleParam === 'affiliate' ? 'AFFILIATE' : roleParam === 'supplier' ? 'SUPPLIER' : roleParam === 'courier' ? 'COURIER' : 'CLIENT'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  function validateEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('passwordMinError') ?? 'Mot de passe : minimum 8 caractères.');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError(t('emailInvalid') ?? 'Adresse email invalide.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          phone: phone || undefined,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('registerError'));
      await login(email, password);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('registerError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-8 px-4 overflow-x-hidden">
      <div className="absolute top-4 left-4 z-10">
        <AppLogo className="btn btn-ghost text-lg btn-sm sm:btn-md" />
      </div>
      <div className="absolute top-4 right-4 flex flex-wrap gap-2 justify-end z-10">
        <ThemeSwitcher />
        <LocaleSwitcher />
      </div>
      <div className="card w-full max-w-md bg-base-100 shadow-xl mx-auto min-w-0">
        <div className="card-body p-4 sm:p-6">
          <h1 className="card-title text-xl sm:text-2xl break-words">{t('signUp')}</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="alert alert-error text-sm break-words">{error}</div>}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={t('firstName')}
                className="input input-bordered flex-1 min-w-0"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value.slice(0, 100))}
                required
                maxLength={100}
                autoComplete="given-name"
              />
              <input
                type="text"
                placeholder={t('lastName')}
                className="input input-bordered flex-1 min-w-0"
                value={lastName}
                onChange={(e) => setLastName(e.target.value.slice(0, 100))}
                required
                maxLength={100}
                autoComplete="family-name"
              />
            </div>
            <input
              type="email"
              placeholder={t('email')}
              className="input input-bordered w-full min-w-0"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 255))}
              required
              maxLength={255}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder={t('passwordMin')}
              className="input input-bordered w-full min-w-0"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 128))}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
            <input
              type="tel"
              placeholder={t('phone')}
              className="input input-bordered w-full min-w-0"
              value={phone}
              onChange={(e) => setPhone(e.target.value.slice(0, 20))}
              maxLength={20}
              autoComplete="tel"
            />
            <div className="form-control">
              <label className="label">{t('iAm')}</label>
              <select
                className="select select-bordered w-full max-w-full"
                value={role}
                onChange={(e) => setRole(e.target.value as 'CLIENT' | 'AFFILIATE' | 'SUPPLIER' | 'COURIER')}
              >
                <option value="CLIENT">{t('roleClient')}</option>
                <option value="AFFILIATE">{t('roleAffiliate')}</option>
                <option value="SUPPLIER">{t('roleSupplier')}</option>
                <option value="COURIER">{t('roleCourier')}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? t('signUp') + '...' : t('signUp')}
            </button>
          </form>
          <p className="text-sm mt-2 break-words">
            {t('hasAccount')} <Link href="/auth/login" className="link">{t('signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
