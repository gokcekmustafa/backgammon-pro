'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export default function Register() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password || !username || !displayName) {
      setError(t.auth.allFieldsRequired);
      return;
    }

    if (password.length < 8) {
      setError(t.auth.passwordMinLength);
      return;
    }

    setLoading(true);
    try {
      await register(email, password, username, displayName);
    } catch (err) {
      if (err instanceof ApiError) {
        setError((err.body as { error?: string })?.error || t.auth.registrationFailed);
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
          <h1 className="text-2xl font-bold">{t.auth.signUpHeading}</h1>
          <p className="mt-1 text-sm text-stone-400">{t.auth.signUpSubtitle}</p>

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
              <label htmlFor="username" className="block text-sm font-medium text-stone-300">
                {t.auth.username}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                placeholder={t.auth.usernamePlaceholder}
              />
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-stone-300">
                {t.auth.displayName}
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                placeholder={t.auth.displayNamePlaceholder}
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
              {loading ? t.auth.creatingAccount : t.auth.signUpButton}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            {t.auth.haveAccount}{' '}
            <Link href="/login" className="text-amber-500 hover:text-amber-400">
              {t.auth.signInLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
