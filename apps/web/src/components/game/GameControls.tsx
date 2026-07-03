'use client';

import { useGame } from '@/providers/GameProvider';

export default function GameControls() {
  const { canUndo, undo, resign, gameOver } = useGame();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-100 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Undo
      </button>
      <button
        onClick={resign}
        disabled={gameOver}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-400 hover:text-stone-100 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Resign
      </button>
    </div>
  );
}
