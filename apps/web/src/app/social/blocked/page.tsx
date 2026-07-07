'use client';

import { useBlockedUsers, useUnblockUser } from '@/hooks/useSocial';
import Button from '@/components/Button';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function BlockedUsersPage() {
  const { data, isLoading, isError } = useBlockedUsers();
  const unblock = useUnblockUser();
  const t = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/social" className="text-sm text-amber-500 hover:text-amber-400">
        &larr; {t.nav.friends}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-100">{t.social.blockedUsers}</h1>

      <div className="mt-6">
        {isLoading && <p className="text-sm text-stone-500">{t.common.loading}</p>}
        {isError && <p className="text-sm text-red-400">{t.social.failedRequests}</p>}

        {data?.users.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-500">{t.social.noBlocked}</p>
        )}
        <div className="space-y-2">
          {data?.users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-stone-100">{u.displayName}</p>
                <p className="text-xs text-stone-500">@{u.username}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => unblock.mutate(u.id)}
                disabled={unblock.isPending}
              >
                {t.social.unblock}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
