'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function Home() {
  const t = useTranslation();
  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t.home.title}</h1>
        <p className="mt-4 text-stone-400">{t.home.subtitle}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
          >
            {t.home.signIn}
          </Link>
          <Link
            href="/guest-login"
            className="rounded-lg border border-stone-700 px-6 py-3 text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-800"
          >
            {t.home.playAsGuest}
          </Link>
          <Link
            href="/lobby"
            className="rounded-lg border border-stone-700 px-6 py-3 text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-800"
          >
            {t.home.browseLobby}
          </Link>
        </div>
      </div>
    </div>
  );
}
