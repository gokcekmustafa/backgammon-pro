'use client';

import { useTranslation } from '@/lib/i18n';

export default function DoublingCube() {
  const t = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
        {t.table.cube}
      </span>
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-700 bg-stone-900">
        <span className="text-xs font-bold text-stone-600">64</span>
      </div>
    </div>
  );
}
