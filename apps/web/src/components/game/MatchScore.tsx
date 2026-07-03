'use client';

import { useGame } from '@/providers/GameProvider';

export default function MatchScore() {
  const { gameState } = useGame();
  const p1Score = gameState.players[0].checkersBorneOff;
  const p2Score = gameState.players[1].checkersBorneOff;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
        Borne off
      </span>
      <span className="text-xs text-stone-300 font-mono">
        {p1Score} &ndash; {p2Score}
      </span>
    </div>
  );
}
