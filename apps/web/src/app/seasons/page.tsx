'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useSeasons, useActiveSeason } from '@/hooks/useSeasons';

export default function SeasonsPage() {
  const { data: active } = useActiveSeason();
  const { data: all } = useSeasons();
  const t = useTranslation();

  const statusColors: Record<string, string> = {
    ACTIVE: 'text-green-400 bg-green-900/20',
    ENDING_SOON: 'text-amber-400 bg-amber-900/20',
    UPCOMING: 'text-blue-400 bg-blue-900/20',
    COMPLETED: 'text-stone-400 bg-stone-900/20',
    ARCHIVED: 'text-stone-600 bg-stone-900/10',
  };

  const seasons = all?.seasons ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-100 mb-6">Seasons</h1>

      {active && (
        <div className="rounded-lg border border-amber-600/30 bg-amber-900/10 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-500 uppercase tracking-wider mb-1">Active Season</p>
              <h2 className="text-xl font-bold text-stone-100">{active.name}</h2>
              {active.description && <p className="text-sm text-stone-400 mt-1">{active.description}</p>}
              <p className="text-xs text-stone-500 mt-2">Season {active.seasonNumber}</p>
            </div>
            <Link
              href="/battle-pass"
              className="px-4 py-2 rounded-lg bg-amber-500 text-stone-950 text-sm font-semibold hover:bg-amber-400 transition-colors"
            >
              Battle Pass
            </Link>
          </div>
          <div className="mt-4 flex gap-4 text-sm text-stone-500">
            <span>Starts: {new Date(active.startsAt).toLocaleDateString()}</span>
            <span>Ends: {new Date(active.endsAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {seasons.map((season) => (
          <Link
            key={season.id}
            href={`/battle-pass?seasonId=${season.id}`}
            className="block rounded-lg border border-stone-800 bg-stone-900/50 p-4 hover:bg-stone-900/80 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-200">{season.name}</h3>
                <p className="text-xs text-stone-500">Season {season.seasonNumber}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[season.status] || 'text-stone-500'}`}>
                {season.status}
              </span>
            </div>
            {season.description && <p className="text-xs text-stone-500 mt-1">{season.description}</p>}
            <div className="mt-2 flex gap-3 text-xs text-stone-600">
              <span>{new Date(season.startsAt).toLocaleDateString()} - {new Date(season.endsAt).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
        {seasons.length === 0 && (
          <p className="text-stone-500 text-center py-8">No seasons yet.</p>
        )}
      </div>
    </div>
  );
}