'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTournaments } from '@/hooks/useTournaments';
import Button from '@/components/Button';
import { useTranslation } from '@/lib/i18n';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-stone-800 text-stone-400',
  REGISTRATION: 'bg-blue-900/30 text-blue-400',
  READY: 'bg-yellow-900/30 text-yellow-400',
  IN_PROGRESS: 'bg-green-900/30 text-green-400',
  FINISHED: 'bg-stone-800 text-stone-500',
  CANCELLED: 'bg-red-900/30 text-red-400',
};

export default function TournamentsPage() {
  const t = useTranslation();
  const statusLabels: Record<string, string> = {
    DRAFT: t.tournaments.status_draft,
    REGISTRATION: t.tournaments.status_open,
    READY: t.tournaments.status_ready,
    IN_PROGRESS: t.tournaments.status_inProgress,
    FINISHED: t.tournaments.status_finished,
    CANCELLED: t.tournaments.status_cancelled,
  };
  const typeLabels: Record<string, string> = {
    SINGLE_ELIMINATION: t.tournaments.type_singleElim,
    DOUBLE_ELIMINATION: t.tournaments.type_doubleElim,
    ROUND_ROBIN: t.tournaments.type_roundRobin,
  };
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const params: { offset: number; limit: number; status?: string } = { offset, limit };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading, isError } = useTournaments(params);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/" className="text-sm text-amber-500 hover:text-amber-400">
          &larr; {t.common.back}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-100">{t.tournaments.title}</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setStatusFilter('');
            setOffset(0);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !statusFilter
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-stone-900 text-stone-400 hover:text-stone-100'
          }`}
        >
          {t.common.all}
        </button>
        {['REGISTRATION', 'IN_PROGRESS', 'FINISHED'].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setOffset(0);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-stone-900 text-stone-400 hover:text-stone-100'
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
        <p className="py-8 text-center text-sm text-red-400">{t.tournaments.failedLoad}</p>
      )}

      {data && (
        <>
          {data.tournaments.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-500">
              {t.tournaments.noTournaments}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900">
                    <th className="px-4 py-3 font-semibold text-stone-400">{t.tournaments.name}</th>
                    <th className="px-4 py-3 font-semibold text-stone-400">{t.tournaments.type}</th>
                    <th className="px-4 py-3 font-semibold text-stone-400">
                      {t.tournaments.status}
                    </th>
                    <th className="px-4 py-3 font-semibold text-stone-400">
                      {t.tournaments.players}
                    </th>
                    <th className="px-4 py-3 font-semibold text-stone-400">
                      {t.tournaments.prizePool}
                    </th>
                    <th className="px-4 py-3 font-semibold text-stone-400">
                      {t.tournaments.entryFee}
                    </th>
                    <th className="px-4 py-3 font-semibold text-stone-400">
                      {t.tournaments.starts}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.tournaments.map((tourn) => (
                    <tr
                      key={tourn.id}
                      className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/tournaments/${tourn.id}`}
                          className="font-medium text-amber-500 hover:text-amber-400"
                        >
                          {tourn.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-400">
                        {typeLabels[tourn.type] ?? tourn.type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors[tourn.status] ?? ''}`}
                        >
                          {statusLabels[tourn.status] ?? tourn.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-300">
                        {tourn.playerCount}/{tourn.maxPlayers}
                      </td>
                      <td className="px-4 py-3 text-stone-300">
                        {tourn.prizePool > 0 ? `$${tourn.prizePool}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-stone-300">
                        {tourn.entryFee > 0 ? `$${tourn.entryFee}` : t.common.free}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        {new Date(tourn.startsAt).toLocaleDateString()}
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
                {t.common.showing}
                {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  {t.common.previous}
                </Button>
                <Button
                  variant="secondary"
                  disabled={offset + limit >= data.total}
                  onClick={() => setOffset(offset + limit)}
                >
                  {t.common.next}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
