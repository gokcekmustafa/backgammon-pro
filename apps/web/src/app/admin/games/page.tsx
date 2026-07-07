'use client';

import { useState } from 'react';
import { useAdminGames, useAdminGameAction } from '@/hooks/useAdmin';
import Button from '@/components/Button';
import { useTranslation } from '@/lib/i18n';

function formatDuration(ms: number) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function AdminLiveGames() {
  const t = useTranslation();
  const { data, isLoading, isError } = useAdminGames();
  const gameAction = useAdminGameAction();
  const [resignPlayer, setResignPlayer] = useState<Record<string, 1 | 2>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (isError) {
    return <p className="py-8 text-center text-sm text-red-400">{t.admin.failedGames}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-stone-100">{t.admin.liveGamesTitle}</h1>

      <div className="overflow-x-auto rounded-lg border border-stone-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-900">
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_table}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_player1}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_player2}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_status}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_duration}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_actions}</th>
            </tr>
          </thead>
          <tbody>
            {data?.games.map((game) => (
              <tr
                key={game.tableId}
                className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50"
              >
                <td className="px-4 py-3 font-medium text-stone-100">{game.tableId}</td>
                <td className="px-4 py-3 text-xs text-stone-300">{game.p1UserId}</td>
                <td className="px-4 py-3 text-xs text-stone-300">{game.p2UserId}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      game.status === 'active'
                        ? 'bg-green-900/30 text-green-400'
                        : game.status === 'paused'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {game.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {formatDuration(Date.now() - game.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap gap-1">
                      {game.status === 'paused' ? (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            gameAction.mutate({ gameId: game.tableId, action: 'resume' })
                          }
                          disabled={gameAction.isPending}
                        >
                          {t.admin.resume}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            gameAction.mutate({ gameId: game.tableId, action: 'pause' })
                          }
                          disabled={gameAction.isPending}
                        >
                          {t.admin.pause}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() =>
                          gameAction.mutate({ gameId: game.tableId, action: 'terminate' })
                        }
                        disabled={gameAction.isPending}
                      >
                        {t.admin.terminate}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          gameAction.mutate({ gameId: game.tableId, action: 'force-draw' })
                        }
                        disabled={gameAction.isPending}
                      >
                        {t.admin.forceDraw}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => gameAction.mutate({ gameId: game.tableId, action: 'kick' })}
                        disabled={gameAction.isPending}
                      >
                        {t.admin.kick}
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <span className="text-xs text-stone-500 mr-1 self-center">
                        {t.admin.resignLabel}
                      </span>
                      <select
                        value={resignPlayer[game.tableId] ?? 1}
                        onChange={(e) =>
                          setResignPlayer((prev) => ({
                            ...prev,
                            [game.tableId]: Number(e.target.value) as 1 | 2,
                          }))
                        }
                        className="rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                      >
                        <option value={1}>{t.admin.p1}</option>
                        <option value={2}>{t.admin.p2}</option>
                      </select>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          gameAction.mutate({
                            gameId: game.tableId,
                            action: 'force-resign',
                            body: { player: resignPlayer[game.tableId] ?? 1 },
                          })
                        }
                        disabled={gameAction.isPending}
                      >
                        {t.admin.go}
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.games.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-500">{t.admin.noActiveGames}</p>
      )}
    </div>
  );
}
