'use client';

import { useAdminModerators, useToggleModerator } from '@/hooks/useAdmin';
import Button from '@/components/Button';

export default function AdminModerators() {
  const { data, isLoading, isError } = useAdminModerators();
  const toggleMod = useToggleModerator();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (isError) {
    return <p className="py-8 text-center text-sm text-red-400">Failed to load moderators.</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-stone-100">Moderators</h1>

      <div className="overflow-x-auto rounded-lg border border-stone-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-900">
              <th className="px-4 py-3 font-semibold text-stone-400">User</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Role</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Since</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((user) => (
              <tr key={user.id} className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50">
                <td className="px-4 py-3">
                  <span className="font-medium text-stone-100">{user.displayName}</span>
                  <p className="text-xs text-stone-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs ${
                    user.role === 'SUPER_ADMIN' ? 'bg-amber-900/30 text-amber-400' :
                    user.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {user.role === 'MODERATOR' && (
                    <Button
                      variant="ghost"
                      onClick={() => toggleMod.mutate({ id: user.id, promote: false })}
                      disabled={toggleMod.isPending}
                    >
                      Demote
                    </Button>
                  )}
                  {user.role !== 'MODERATOR' && (
                    <span className="text-xs text-stone-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
