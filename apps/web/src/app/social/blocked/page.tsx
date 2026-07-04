'use client';

import { useBlockedUsers, useUnblockUser } from '@/hooks/useSocial';
import Button from '@/components/Button';
import Link from 'next/link';

export default function BlockedUsersPage() {
  const { data, isLoading, isError } = useBlockedUsers();
  const unblock = useUnblockUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/social" className="text-sm text-amber-500 hover:text-amber-400">&larr; Friends</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-100">Blocked Users</h1>

      <div className="mt-6">
        {isLoading && <p className="text-sm text-stone-500">Loading...</p>}
        {isError && <p className="text-sm text-red-400">Failed to load.</p>}

        {data?.users.length === 0 && <p className="py-8 text-center text-sm text-stone-500">No blocked users.</p>}
        <div className="space-y-2">
          {data?.users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-100">{u.displayName}</p>
                <p className="text-xs text-stone-500">@{u.username}</p>
              </div>
              <Button variant="secondary" onClick={() => unblock.mutate(u.id)} disabled={unblock.isPending}>Unblock</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}