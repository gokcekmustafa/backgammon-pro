'use client';

import { useState } from 'react';
import { useAdminAudit } from '@/hooks/useAdmin';
import Button from '@/components/Button';

const actionColors: Record<string, string> = {
  BAN: 'text-red-400',
  UNBAN: 'text-green-400',
  DELETE: 'text-red-400',
  ENABLE: 'text-green-400',
  DISABLE: 'text-orange-400',
  CHANGE_ROLE: 'text-blue-400',
  PROMOTE_MODERATOR: 'text-purple-400',
  DEMOTE_MODERATOR: 'text-orange-400',
};

export default function AdminAudit() {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading, isError } = useAdminAudit({ offset, limit });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (isError) {
    return <p className="py-8 text-center text-sm text-red-400">Failed to load audit log.</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-stone-100">Audit Log</h1>

      <div className="overflow-x-auto rounded-lg border border-stone-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-900">
              <th className="px-4 py-3 font-semibold text-stone-400">Actor</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Action</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Target</th>
              <th className="px-4 py-3 font-semibold text-stone-400">IP</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map((log) => (
              <tr key={log.id} className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50">
                <td className="px-4 py-3">
                  <span className="text-stone-100">{log.actor?.displayName ?? 'Unknown'}</span>
                  <p className="text-xs text-stone-500">{log.actor?.username ?? ''}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${actionColors[log.action] ?? 'text-stone-300'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-stone-300">{log.target?.displayName ?? '—'}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-stone-500">
                  {log.ip ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-stone-400">
        <span>
          Showing {offset + 1}–{Math.min(offset + limit, data?.total ?? 0)} of {data?.total ?? 0}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={(data ? offset + limit >= data.total : true)}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
