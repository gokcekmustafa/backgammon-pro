'use client';

import { useAdminBanned, useToggleBan } from '@/hooks/useAdmin';
import Button from '@/components/Button';

export default function AdminBanned() {
  const { data, isLoading, isError } = useAdminBanned();
  const toggleBan = useToggleBan();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (isError) {
    return <p className="py-8 text-center text-sm text-red-400">Failed to load banned users.</p>;
  }

  const users = data?.users ?? [];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-stone-100">Banned Users</h1>

      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-700 py-12 text-center">
          <p className="text-sm text-stone-500">No banned users.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-900">
                <th className="px-4 py-3 font-semibold text-stone-400">User</th>
                <th className="px-4 py-3 font-semibold text-stone-400">Banned At</th>
                <th className="px-4 py-3 font-semibold text-stone-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-stone-100">{user.displayName}</span>
                    <p className="text-xs text-stone-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {user.bannedAt ? new Date(user.bannedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      onClick={() => toggleBan.mutate({ id: user.id, banned: false })}
                      disabled={toggleBan.isPending}
                    >
                      Unban
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
