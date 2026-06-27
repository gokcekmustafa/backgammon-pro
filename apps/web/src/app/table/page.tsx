'use client';

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

export default function TablePage() {
  return (
    <main>
      <div className="game-table-rotate min-h-[calc(100vh-4rem)]">
        <RotatePrompt />
      </div>

      <div className="game-table-normal min-h-[calc(100vh-4rem)] flex-col md:flex-row">
        {/* ── Desktop / Tablet layout (md+) ─────────────────── */}
        <div className="hidden md:flex flex-1 min-h-0">
          <aside className="w-24 shrink-0 border-r border-stone-800 xl:w-32">
            <PlayerPanel _side="left" />
          </aside>

          <section className="flex flex-1 flex-col overflow-y-auto px-4 py-4 xl:px-8">
            <div className="flex max-w-2xl flex-1 flex-col items-center justify-center self-center">
              <BoardArea />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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

          <aside className="w-24 shrink-0 border-x border-stone-800 xl:w-32">
            <PlayerPanel _side="right" />
          </aside>

          <aside className="hidden w-64 shrink-0 border-l border-stone-800 p-3 xl:block xl:w-72">
            <ChatPanel />
          </aside>
        </div>

        {/* ── Mobile landscape layout (< md) ────────────────── */}
        <div className="flex md:hidden flex-1 flex-col overflow-y-auto">
          <div className="flex items-center px-2 pt-2">
            <div className="w-14 shrink-0">
              <PlayerPanel _side="left" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-center px-1">
              <BoardArea />
            </div>
            <div className="w-14 shrink-0">
              <PlayerPanel _side="right" />
            </div>
          </div>

          <div className="space-y-2 px-3 pb-4 pt-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <DiceArea />
              <DoublingCube />
              <MatchScore />
            </div>
            <div className="flex flex-wrap items-center gap-x-2">
              <GameControls />
              <ConnectionStatus />
            </div>
            <ChatPanel />
          </div>
        </div>

        {/* ── Bottom nav (desktop only) ─────────────────────── */}
        <div className="hidden border-t border-stone-800 px-4 py-2 md:flex items-center justify-between text-xs text-stone-500">
          <Link href="/lobby" className="hover:text-stone-300 transition-colors">
            &larr; Back to Lobby
          </Link>
          <span className="text-stone-600">Table 1</span>
        </div>
      </div>
    </main>
  );
}
