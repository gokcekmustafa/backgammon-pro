'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function NotFound() {
  const t = useTranslation();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-stone-700">{t.notFound.title}</h1>
        <p className="mt-4 text-lg text-stone-400">{t.notFound.heading}</p>
        <p className="mt-2 text-sm text-stone-500">{t.notFound.message}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
        >
          {t.notFound.goHome}
        </Link>
      </div>
    </div>
  );
}
