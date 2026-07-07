'use client';

import { useTranslation } from '@/lib/i18n';
import { useGame } from '@/providers/GameProvider';
import { Player } from '@backgammon/game-engine';

interface PlayerPanelProps {
  player: Player;
  playerName?: string;
}

const PLAYER_COLORS: Record<Player, string> = {
  [Player.One]: 'bg-amber-200 border-amber-400',
  [Player.Two]: 'bg-stone-700 border-stone-500',
};

export default function PlayerPanel({ player, playerName }: PlayerPanelProps) {
  const t = useTranslation();
  const { gameState } = useGame();
  const idx = player === Player.One ? 0 : 1;
  const barCount = gameState.players[idx].checkersOnBar;
  const borneOff = gameState.players[idx].checkersBorneOff;
  const isActive = gameState.currentPlayer === player;

  const displayName = playerName ?? (player === Player.One ? t.table.player1 : t.table.player2);

  return (
    <div
      className={`flex flex-col items-center gap-2 py-4 lg:py-8 ${isActive ? 'opacity-100' : 'opacity-50'}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${PLAYER_COLORS[player]} text-xs font-bold text-stone-900`}
      >
        {player === Player.One ? 'P1' : 'P2'}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-stone-400">{displayName}</p>
        {isActive && (
          <p
            className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider"
            aria-live="polite"
          >
            {t.table.yourTurn}
          </p>
        )}
        {barCount > 0 && (
          <p
            className="text-[10px] text-red-400 font-semibold"
            aria-label={`${barCount} checkers ${t.table.onBar}`}
          >
            {barCount} {t.table.onBar}
          </p>
        )}
        {borneOff > 0 && (
          <p
            className="text-[10px] text-stone-500"
            aria-label={`${borneOff} checkers ${t.table.borneOffSuffix}`}
          >
            {borneOff} {t.table.borneOffSuffix}
          </p>
        )}
      </div>
    </div>
  );
}
