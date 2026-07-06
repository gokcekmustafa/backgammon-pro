'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BoardArea from '@/components/game/BoardArea';
import PlayerPanel from '@/components/game/PlayerPanel';
import DiceArea from '@/components/game/DiceArea';
import DoublingCube from '@/components/game/DoublingCube';
import MatchScore from '@/components/game/MatchScore';
import GameControls from '@/components/game/GameControls';
import ConnectionStatus from '@/components/game/ConnectionStatus';
import RotatePrompt from '@/components/game/RotatePrompt';
import ChatPanel from '@/components/lobby/ChatPanel';
import Link from 'next/link';
import { GameProvider } from '@/providers/GameProvider';
import { useAuth } from '@/providers/AuthProvider';
import { Player } from '@backgammon/game-engine';

function TableContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const tableId = searchParams.get('id') || undefined;
  const aiMode = searchParams.get('ai') === 'true';
  const player2Name = aiMode ? 'Computer' : undefined;

  return (
    <GameProvider tableId={tableId} aiMode={aiMode}>
      <main>
        <div className="game-table-rotate min-h-[calc(100vh-4rem)]">
          <RotatePrompt />
        </div>

        <div className="game-table-normal min-h-[calc(100vh-4rem)] flex-col md:flex-row">
          {/* ── Desktop / Tablet layout (md+) ─────────────────── */}
          <div className="hidden md:flex flex-1 min-h-0">
            <aside className="w-24 shrink-0 border-r border-stone-800 xl:w-32 player-panel-card rounded-none border-0 border-r">
              <PlayerPanel player={Player.One} />
            </aside>

            <section className="flex flex-1 flex-col overflow-y-auto px-4 py-4 xl:px-8">
              <div className="flex max-w-2xl flex-1 flex-col items-center justify-center self-center w-full">
                <BoardArea />
              </div>

              <div className="page-card mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 p-4">
                <DiceArea />
                <DoublingCube />
                <MatchScore />
              </div>

              <div className="mt-3 flex justify-center">
                <GameControls />
              </div>

              <div className="mt-3 flex justify-center">
                <ConnectionStatus />
              </div>
            </section>

            <aside className="w-24 shrink-0 border-x border-stone-800 xl:w-32 player-panel-card rounded-none border-0 border-x">
              <PlayerPanel player={Player.Two} playerName={player2Name} />
            </aside>

            <aside className="hidden w-64 shrink-0 border-l border-stone-800 p-3 xl:block xl:w-72 page-card rounded-none border-0 border-l">
              <ChatPanel tableId={tableId} username={user?.displayName} />
            </aside>
          </div>

          {/* ── Mobile landscape layout (< md) ────────────────── */}
          <div className="flex md:hidden flex-1 flex-col overflow-y-auto">
            <div className="flex items-center px-2 pt-2">
              <div className="w-16 shrink-0 player-panel-card p-2">
                <PlayerPanel player={Player.One} />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-center px-1">
                <BoardArea />
              </div>
              <div className="w-16 shrink-0 player-panel-card p-2">
                <PlayerPanel player={Player.Two} playerName={player2Name} />
              </div>
            </div>

            <div className="page-card mx-3 mt-2 space-y-2 p-3 pb-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <DiceArea />
                <DoublingCube />
                <MatchScore />
              </div>
              <div className="flex flex-wrap items-center gap-x-2">
                <GameControls />
                <ConnectionStatus />
              </div>
              <ChatPanel tableId={tableId} username={user?.displayName} />
            </div>
          </div>

          {/* ── Bottom nav (desktop only) ─────────────────────── */}
          <div className="hidden border-t border-stone-800 px-4 py-2 md:flex items-center justify-between text-xs text-stone-500">
            <Link href="/lobby" className="hover:text-stone-300 transition-colors">
              &larr; Back to Lobby
            </Link>
            <span className="text-stone-600">
              {aiMode ? 'vs Computer' : `Table ${tableId ?? '—'}`}
            </span>
          </div>
        </div>
      </main>
    </GameProvider>
  );
}

export default function TablePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
        </div>
      }
    >
      <TableContent />
    </Suspense>
  );
}
