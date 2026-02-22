'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <ThemeSwitcher />
        <LocaleSwitcher />
      </div>
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl">{t('signUp')}</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="alert alert-error text-sm">{error}</div>}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('firstName')}
                className="input input-bordered flex-1"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder={t('lastName')}
                className="input input-bordered flex-1"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <input
              type="email"
              placeholder={t('email')}
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder={t('passwordMin')}
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <input
              type="tel"
              placeholder={t('phone')}
              className="input input-bordered w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="form-control">
              <label className="label">{t('iAm')}</label>
              <select
                className="select select-bordered w-full"
                value={role}
                onChange={(e) => setRole(e.target.value as 'CLIENT' | 'AFFILIATE' | 'SUPPLIER' | 'COURIER')}
              >
                <option value="CLIENT">{t('roleClient')}</option>
                <option value="AFFILIATE">{t('roleAffiliate')}</option>
                <option value="SUPPLIER">{t('roleSupplier')}</option>
                <option value="COURIER">{t('roleCourier')}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('signUp') + '...' : t('signUp')}
            </button>
          </form>
          <p className="text-sm mt-2">
            {t('hasAccount')} <Link href="/auth/login" className="link">{t('signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
