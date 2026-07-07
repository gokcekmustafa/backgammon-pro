'use client';

import { useTranslation } from '@/lib/i18n';

export default function RootLoading() {
  const t = useTranslation();
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-label={t.common.loading}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
