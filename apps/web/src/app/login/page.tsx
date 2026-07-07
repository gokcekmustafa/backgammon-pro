'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export default function Login() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t.auth.emailRequired);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError((err.body as { error?: string })?.error || t.auth.loginFailed);
      } else {
        setError(t.auth.unexpectedError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="page-card p-8">
          <h1 className="text-2xl font-bold">{t.auth.signInHeading}</h1>
          <p className="mt-1 text-sm text-stone-400">{t.auth.signInSubtitle}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-300">
                {t.auth.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                placeholder={t.auth.emailPlaceholder}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-300">
                {t.auth.password}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                placeholder={t.auth.passwordPlaceholder}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t.auth.signingIn : t.auth.signInButton}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            {t.auth.noAccount}{' '}
            <Link href="/register" className="text-amber-500 hover:text-amber-400">
              {t.auth.signUpLink}
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-stone-500">
            {t.auth.or}
            <Link href="/guest-login" className="text-amber-500 hover:text-amber-400">
              {t.auth.guestLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
