'use client';

import { useTranslation } from '@/lib/i18n';

export default function RotatePrompt() {
  const t = useTranslation();
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 text-center">
      <div>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-stone-700">
          <svg
            className="h-8 w-8 text-stone-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-stone-300">{t.table.rotatePrompt}</p>
        <p className="mt-2 text-sm text-stone-500">{t.table.rotateDesc}</p>
      </div>
    </div>
  );
}
