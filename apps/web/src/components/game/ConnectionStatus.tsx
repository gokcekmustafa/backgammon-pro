'use client';

import { useTranslation } from '@/lib/i18n';
import { useGame } from '@/providers/GameProvider';
import { GamePhase, TurnPhase } from '@backgammon/game-engine';

export default function ConnectionStatus() {
  const t = useTranslation();
  const { gameState, gameOver, winner, localPlayer, connectionStatus } = useGame();

  return (
    <div aria-live="polite" aria-atomic="true">
      {connectionStatus === 'opponent_disconnected' && (
        <div className="text-xs font-semibold text-red-400">{t.table.opponentDisconnected}</div>
      )}

      {connectionStatus === 'opponent_reconnected' && (
        <div className="text-xs font-semibold text-emerald-400">{t.table.reconnected}</div>
      )}

      {connectionStatus !== 'opponent_disconnected' &&
        connectionStatus !== 'opponent_reconnected' &&
        gameOver && (
          <div className="text-xs font-semibold text-amber-500">
            {winner
              ? `Player ${winner}${t.table.won}`
              : gameState.phase === GamePhase.Cancelled
                ? t.table.gameCancelled
                : t.table.gameOver}
          </div>
        )}

      {!gameOver && connectionStatus === 'connected' && localPlayer && (
        <div
          className={`text-xs font-semibold uppercase tracking-wider ${gameState.currentPlayer === localPlayer ? 'text-emerald-400' : 'text-stone-400'}`}
        >
          {gameState.currentPlayer === localPlayer ? t.table.yourTurn : t.table.opponentTurn}
        </div>
      )}

      {!gameOver && (connectionStatus === 'connected' || !localPlayer) && !localPlayer && (
        <div className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
          {gameState.turn.phase === TurnPhase.WaitingForRoll
            ? t.table.rollToStart
            : t.table.playerMove.replace('{player}', gameState.currentPlayer.toString())}
        </div>
      )}
    </div>
  );
}
