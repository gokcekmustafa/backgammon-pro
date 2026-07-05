'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { usePlayerStats } from '@/hooks/useStats';
import { useMatchHistory, type MatchEntry } from '@/hooks/useMatchHistory';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/lib/api';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12" role="status">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function Avatar({
  displayName,
  avatarUrl,
  size = 'lg',
  onUpload,
  canEdit,
}: {
  displayName: string;
  avatarUrl: string | null;
  size?: 'sm' | 'lg';
  onUpload?: (dataUrl: string) => void;
  canEdit?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sizeClasses = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-8 w-8 text-sm';
  const initials = (displayName ?? '?').charAt(0).toUpperCase();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative inline-block">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${displayName}'s avatar`}
          className={`${sizeClasses} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses} flex items-center justify-center rounded-full bg-amber-500 font-bold text-stone-950`}
          aria-hidden="true"
        >
          {initials}
        </div>
      )}
      {canEdit && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-stone-950 shadow transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label="Change avatar"
          >
            ✎
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFile}
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="rounded-lg border border-stone-800 bg-stone-900 p-4 text-center"
      style={{
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-bg-secondary))',
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${color ?? 'text-stone-100'}`}
        style={{ color: color ?? 'rgb(var(--color-text))' }}
      >
        {value}
      </p>
    </div>
  );
}

function MatchRow({ match, t }: { match: MatchEntry; t: ReturnType<typeof useTranslation> }) {
  const resultColors: Record<string, string> = {
    win: 'text-green-400',
    loss: 'text-red-400',
    draw: 'text-stone-400',
  };
  const resultLabels: Record<string, string> = {
    win: t.match.result_win,
    loss: t.match.result_loss,
    draw: t.match.result_draw,
  };

  const bgColors: Record<string, string> = {
    win: 'bg-green-900/10',
    loss: 'bg-red-900/10',
    draw: '',
  };

  const durationStr =
    match.duration !== null
      ? match.duration >= 60
        ? `${Math.floor(match.duration / 60)}${t.match.minutes}`
        : `${match.duration}${t.match.seconds}`
      : '—';

  return (
    <tr
      className={`border-b border-stone-800 last:border-0 hover:bg-stone-900/50 ${bgColors[match.result] ?? ''}`}
      style={{ borderColor: 'rgb(var(--color-border))' }}
    >
      <td className="px-4 py-3">
        <span className={`font-semibold ${resultColors[match.result]}`}>
          {resultLabels[match.result]}
        </span>
      </td>
      <td className="px-4 py-3 text-stone-300">
        {match.opponent ? (
          <Link
            href={`/players/${match.opponent.id}`}
            className="text-amber-500 hover:text-amber-400"
          >
            {t.match.unknown}
          </Link>
        ) : (
          <span className="text-stone-500">{t.match.unknown}</span>
        )}
      </td>
      <td className="hidden px-4 py-3 font-mono text-sm text-stone-400 sm:table-cell">
        {match.score}
      </td>
      <td className="hidden px-4 py-3 text-stone-500 md:table-cell">{durationStr}</td>
      <td className="px-4 py-3 text-xs text-stone-500">
        {new Date(match.completedAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

export default function PlayerProfile() {
  const params = useParams();
  const playerId = params.id as string;
  const { user } = useAuth();
  const isOwnProfile = user?.id === playerId;
  const { data: stats, isLoading, isError, refetch } = usePlayerStats(playerId);
  const { data: matches, isLoading: matchesLoading } = useMatchHistory(playerId, 20);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const t = useTranslation();

  const handleAvatarUpload = async (dataUrl: string) => {
    setUploading(true);
    setUploadError(null);
    try {
      const { api } = await import('@/lib/api');
      await api(`/api/players/${playerId}/avatar`, {
        method: 'POST',
        body: JSON.stringify({ image: dataUrl }),
      });
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to upload avatar';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (isError || !stats) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-stone-100">{t.profile.notFound}</h1>
        <p className="mt-2 text-stone-400">{t.profile.notFoundDesc}</p>
        <Link href="/leaderboard" className="mt-4 inline-block text-amber-500 hover:text-amber-400">
          {t.profile.viewLeaderboard}
        </Link>
      </div>
    );
  }

  const displayName = stats.displayName ?? stats.username ?? 'Unknown';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Avatar
          displayName={displayName}
          avatarUrl={stats.avatarUrl}
          size="lg"
          onUpload={handleAvatarUpload}
          canEdit={isOwnProfile && !uploading}
        />
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-stone-100">{displayName}</h1>
          {stats.username && <p className="text-sm text-stone-500">@{stats.username}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span
              className="inline-block rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-400"
              style={{ backgroundColor: 'rgb(var(--color-bg-tertiary))' }}
            >
              {stats.type === 'guest' ? t.profile.guest : t.profile.registered}
            </span>
            {stats.leaderboardRank && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                #{stats.leaderboardRank}
              </span>
            )}
            {stats.country && (
              <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                {stats.country}
              </span>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="mt-3 rounded bg-red-900/20 px-3 py-2 text-sm text-red-400" role="alert">
          {uploadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t.profile.rating} value={stats.rating?.toString() ?? '—'} />
        <StatCard label={t.profile.highestRating} value={stats.peakRating?.toString() ?? '—'} />
        <StatCard
          label={t.profile.currentStreak}
          value={stats.currentStreak > 0 ? `🔥 ${stats.currentStreak}` : '—'}
        />
        <StatCard
          label={t.profile.bestStreak}
          value={stats.bestStreak > 0 ? `🏆 ${stats.bestStreak}` : '—'}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t.profile.gamesPlayed} value={stats.gamesPlayed.toString()} />
        <StatCard label={t.profile.wins} value={stats.wins.toString()} color="text-green-400" />
        <StatCard label={t.profile.losses} value={stats.losses.toString()} color="text-red-400" />
        <StatCard label={t.profile.winRate} value={`${stats.winRate}%`} />
      </div>

      {stats.draws > 0 && (
        <div className="mt-4 text-center text-sm text-stone-500">
          {t.profile.draws}: {stats.draws}
        </div>
      )}

      {stats.lastGameAt && (
        <p className="mt-4 text-xs text-stone-500">
          {t.profile.lastGame}: {new Date(stats.lastGameAt).toLocaleDateString()}
        </p>
      )}

      <section className="mt-10" aria-labelledby="match-history-heading">
        <h2 id="match-history-heading" className="mb-4 text-lg font-bold text-stone-100">
          {t.profile.matchHistory}
        </h2>

        {matchesLoading ? (
          <LoadingSpinner />
        ) : !matches || matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-700 py-8 text-center">
            <p className="text-sm text-stone-500">{t.profile.noMatches}</p>
          </div>
        ) : (
          <div
            className="overflow-x-auto rounded-lg border border-stone-800"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr
                  className="border-b border-stone-800 bg-stone-900"
                  style={{
                    borderColor: 'rgb(var(--color-border))',
                    backgroundColor: 'rgb(var(--color-bg-secondary))',
                  }}
                >
                  <th className="px-4 py-3 font-semibold text-stone-400">{t.match.result_win}</th>
                  <th className="px-4 py-3 font-semibold text-stone-400">{t.match.opponent}</th>
                  <th className="hidden px-4 py-3 font-semibold text-stone-400 sm:table-cell">
                    {t.match.score}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-stone-400 md:table-cell">
                    {t.match.duration}
                  </th>
                  <th className="px-4 py-3 font-semibold text-stone-400">{t.match.date}</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <MatchRow key={match.id} match={match} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6">
        <Link href="/leaderboard" className="text-sm text-amber-500 hover:text-amber-400">
          &larr; {t.profile.viewLeaderboard}
        </Link>
      </div>
    </div>
  );
}
