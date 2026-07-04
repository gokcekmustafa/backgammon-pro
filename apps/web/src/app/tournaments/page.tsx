'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTournaments } from '@/hooks/useTournaments';
import Button from '@/components/Button';

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  REGISTRATION: 'Open',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-stone-800 text-stone-400',
  REGISTRATION: 'bg-blue-900/30 text-blue-400',
  READY: 'bg-yellow-900/30 text-yellow-400',
  IN_PROGRESS: 'bg-green-900/30 text-green-400',
  FINISHED: 'bg-stone-800 text-stone-500',
  CANCELLED: 'bg-red-900/30 text-red-400',
};

const typeLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elim',
  DOUBLE_ELIMINATION: 'Double Elim',
  ROUND_ROBIN: 'Round Robin',
};

export default function TournamentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const params: { offset: number; limit: number; status?: string } = { offset, limit };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading, isError } = useTournaments(params);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/" className="text-sm text-amber-500 hover:text-amber-400">&larr; Back</Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-100">Tournaments</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => { setStatusFilter(''); setOffset(0); }}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !statusFilter ? 'bg-amber-500/10 text-amber-500' : 'bg-stone-900 text-stone-400 hover:text-stone-100'
          }`}
        >
          All
        </button>
        {['REGISTRATION', 'IN_PROGRESS', 'FINISHED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setOffset(0); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-amber-500/10 text-amber-500' : 'bg-stone-900 text-stone-400 hover:text-stone-100'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-red-400">Failed to load tournaments.</p>
      )}

      {data && (
        <>
          {data.tournaments.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-500">No tournaments found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900">
                    <th className="px-4 py-3 font-semibold text-stone-400">Name</th>
                    <th className="px-4 py-3 font-semibold text-stone-400">Type</th>
                    <th className="px-4 py-3 font-semibold text-stone-400">Status</th>
                    <th className="px-4 py-3 font-semibold text-stone-400">Players</th>
                    <th className="px-4 py-3 font-semibold text-stone-400">Prize Pool</th>
                    <th className="px-4 py-3 font-semibold text-stone-400">Entry Fee</th>
                    <th className="px-4 py-3 font-semibold text-stone-400">Starts</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tournaments.map((t) => (
                    <tr key={t.id} className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50">
                      <td className="px-4 py-3">
                        <Link href={`/tournaments/${t.id}`} className="font-medium text-amber-500 hover:text-amber-400">
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-400">{typeLabels[t.type] ?? t.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors[t.status] ?? ''}`}>
                          {statusLabels[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-300">{t.playerCount}/{t.maxPlayers}</td>
                      <td className="px-4 py-3 text-stone-300">{t.prizePool > 0 ? `$${t.prizePool}` : '-'}</td>
                      <td className="px-4 py-3 text-stone-300">{t.entryFee > 0 ? `$${t.entryFee}` : 'Free'}</td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        {new Date(t.startsAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.total > limit && (
            <div className="mt-4 flex items-center justify-between text-sm text-stone-400">
              <span>
                Showing {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                  Previous
                </Button>
                <Button variant="secondary" disabled={offset + limit >= data.total} onClick={() => setOffset(offset + limit)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}