'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useLeaderboard } from '@/hooks/useStats';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

const PAGE_SIZE = 20;

const rankBadges: Record<number, { icon: string; className: string }> = {
  1: { icon: '🥇', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-600' },
  2: { icon: '🥈', className: 'bg-gray-300/10 text-gray-300 border-gray-500' },
  3: { icon: '🥉', className: 'bg-orange-800/20 text-orange-400 border-orange-700' },
};

function RankCell({ rank }: { rank: number }) {
  const badge = rankBadges[rank];
  if (badge) {
    return (
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold ${badge.className}`}
        >
          {badge.icon}
        </span>
      </td>
    );
  }
  return (
    <td className="px-4 py-3 text-stone-500">
      <span className="font-mono text-xs">{rank}</span>
    </td>
  );
}

function RatingTrend({ rating, peakRating }: { rating: number; peakRating: number }) {
  if (peakRating > rating) {
    return (
      <span className="ml-1 text-xs text-red-500" title={`Peak: ${peakRating}`}>
        ↓
      </span>
    );
  }
  if (peakRating === rating && rating > 1200) {
    return (
      <span className="ml-1 text-xs text-green-500" title="At peak">
        ↑
      </span>
    );
  }
  return <span className="ml-1 text-xs text-stone-500">—</span>;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12" role="status">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default function Leaderboard() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { user } = useAuth();
  const t = useTranslation();

  const { data, isLoading, isError, isFetching } = useLeaderboard(
    page * PAGE_SIZE,
    PAGE_SIZE,
    search || undefined,
  );

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = page + 1;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearch(searchInput.trim());
      setPage(0);
    },
    [searchInput],
  );

  const handleClear = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setPage(0);
  }, []);

  const userEntry = data?.players.find((p) => p.id === user?.id);
  const userOnOtherPage = user && data && !userEntry && !search;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-stone-100">{t.leaderboard.title}</h1>

        <form
          onSubmit={handleSearch}
          className="flex gap-2"
          role="search"
          aria-label="Search players"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t.leaderboard.searchPlaceholder}
            className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label={t.leaderboard.searchPlaceholder}
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
            disabled={isFetching}
          >
            {t.common.search}
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-400 transition-colors hover:text-stone-100"
            >
              &times;
            </button>
          )}
        </form>
      </div>

      {/* Current user's rank banner */}
      {userOnOtherPage && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-stone-300">
          <Link
            href={`/players/${user.id}`}
            className="font-medium text-amber-500 hover:text-amber-400"
          >
            {user.displayName}
          </Link>
          {' — you are not on this page. '}
          <button
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setPage(0);
            }}
            className="text-amber-500 hover:text-amber-400 underline"
          >
            Go to first page
          </button>
        </div>
      )}

      {userEntry && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-stone-300">
          <span className="font-medium text-amber-500">#{userEntry.rank}</span>
          {' — '}
          <Link
            href={`/players/${userEntry.id}`}
            className="font-medium text-amber-500 hover:text-amber-400"
          >
            {userEntry.displayName || userEntry.username}
          </Link>
          {' — '}
          <span className="font-mono text-stone-100">{userEntry.rating}</span>
          {' rating, '}
          {userEntry.winRate}% win rate
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <p className="mt-6 text-center text-red-400">{t.leaderboard.loadError}</p>
      ) : !data || data.players.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-stone-700 py-12 text-center">
          <p className="text-sm text-stone-500">{t.leaderboard.noPlayers}</p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-stone-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900">
                  <th className="px-4 py-3 font-semibold text-stone-400">{t.leaderboard.rank}</th>
                  <th className="px-4 py-3 font-semibold text-stone-400">{t.leaderboard.player}</th>
                  <th className="px-4 py-3 font-semibold text-stone-400">{t.leaderboard.rating}</th>
                  <th className="hidden px-4 py-3 font-semibold text-stone-400 sm:table-cell">
                    {t.leaderboard.winRate}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-stone-400 md:table-cell">
                    {t.leaderboard.games}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.players.map((player) => (
                  <tr
                    key={player.id}
                    className={`border-b border-stone-800 last:border-0 hover:bg-stone-900/50 ${player.id === user?.id ? 'bg-amber-500/5' : ''}`}
                  >
                    <RankCell rank={player.rank} />
                    <td className="px-4 py-3">
                      <Link
                        href={`/players/${player.id}`}
                        className="font-medium text-amber-500 hover:text-amber-400"
                      >
                        {player.displayName || player.username}
                      </Link>
                      {player.id === user?.id && (
                        <span className="ml-2 text-xs text-stone-500">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-100">
                      {player.rating}
                      <RatingTrend rating={player.rating} peakRating={player.peakRating} />
                    </td>
                    <td className="hidden px-4 py-3 text-stone-400 sm:table-cell">
                      {player.winRate}%
                    </td>
                    <td className="hidden px-4 py-3 text-stone-400 md:table-cell">
                      {player.gamesPlayed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="mt-6 flex items-center justify-center gap-4"
              aria-label="Leaderboard pagination"
            >
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-400 transition-colors hover:text-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t.leaderboard.prevPage}
              >
                &larr; {t.leaderboard.prevPage}
              </button>
              <span className="text-sm text-stone-500">
                {t.leaderboard.pageInfo.replace('{page}', `${currentPage} / ${totalPages}`)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-400 transition-colors hover:text-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t.leaderboard.nextPage}
              >
                {t.leaderboard.nextPage} &rarr;
              </button>
            </nav>
          )}
        </>
      )}

      <div className="mt-6">
        <Link href="/lobby" className="text-sm text-amber-500 hover:text-amber-400">
          &larr; Back to Lobby
        </Link>
      </div>
    </div>
  );
}
