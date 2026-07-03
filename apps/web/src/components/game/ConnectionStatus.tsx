'use client';

import { useGame } from '@/providers/GameProvider';
import { GamePhase, TurnPhase } from '@backgammon/game-engine';

export default function ConnectionStatus() {
  const { gameState, gameOver, winner, localPlayer, connectionStatus } = useGame();

  return (
    <div aria-live="polite" aria-atomic="true">
      {connectionStatus === 'opponent_disconnected' && (
        <div className="text-xs font-semibold text-red-400">Opponent disconnected</div>
      )}

      {connectionStatus === 'opponent_reconnected' && (
        <div className="text-xs font-semibold text-emerald-400">Reconnected</div>
      )}

      {connectionStatus !== 'opponent_disconnected' &&
        connectionStatus !== 'opponent_reconnected' &&
        gameOver && (
          <div className="text-xs font-semibold text-amber-500">
            {winner
              ? `Player ${winner} wins!`
              : gameState.phase === GamePhase.Cancelled
                ? 'Game cancelled'
                : 'Game over'}
          </div>
        )}

      {!gameOver && connectionStatus === 'connected' && localPlayer && (
        <div
          className={`text-xs font-semibold uppercase tracking-wider ${gameState.currentPlayer === localPlayer ? 'text-emerald-400' : 'text-stone-400'}`}
        >
          {gameState.currentPlayer === localPlayer ? 'Your turn' : "Opponent's turn"}
        </div>
      )}

      {!gameOver && (connectionStatus === 'connected' || !localPlayer) && !localPlayer && (
        <div className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
          {gameState.turn.phase === TurnPhase.WaitingForRoll
            ? 'Roll the dice to start your turn'
            : `Player ${gameState.currentPlayer}'s move`}
        </div>
      )}
    </div>
  );
}
