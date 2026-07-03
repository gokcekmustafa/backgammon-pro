'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createInitialState, createValidator, GamePhase, TurnPhase } from '@backgammon/game-engine';
import type { GameState } from '@backgammon/game-engine';
import { useWebSocket } from './useWebSocket';
import type { UseGameEngineReturn } from './useGameEngine';

const BOARD_WIDTH = 600;
const CHECKER_PADDING_RATIO = 0.75;
const CHECKER_GAP = 2;

export type ConnectionStatus = 'connected' | 'opponent_disconnected' | 'opponent_reconnected';

export interface UseOnlineGameReturn extends UseGameEngineReturn {
  connectionStatus: ConnectionStatus;
  localPlayer: number | null;
}

export function useOnlineGame(tableId: string | null): UseOnlineGameReturn {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [localPlayer, setLocalPlayer] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');

  const validator = useMemo(() => createValidator(), []);

  // We need the sendMessage from useWebSocket, but also need to handle
  // messages before the component fully mounts. Use a ref for sendMessage.
  const sendRef = useRef<(type: string, payload?: Record<string, unknown>) => void>(() => {});

  const wsHandlers = useMemo(
    () => ({
      GAME_STATE_SYNC: (payload: Record<string, unknown>) => {
        const newState = payload.gameState as GameState;
        const player = payload.player as number;
        setGameState(newState);
        setLocalPlayer(player);
        setSelectedPoint(null);
      },
      GAME_MOVE_REJECTED: () => {
        // Move was rejected - deselect
        setSelectedPoint(null);
      },
      OPPONENT_DISCONNECTED: () => {
        setConnectionStatus('opponent_disconnected');
      },
      OPPONENT_RECONNECTED: () => {
        setConnectionStatus('opponent_reconnected');
        setTimeout(() => setConnectionStatus('connected'), 3000);
      },
    }),
    [],
  );

  const { sendMessage, isConnected } = useWebSocket(null, wsHandlers);

  // Keep sendMessage ref updated
  useEffect(() => {
    sendRef.current = sendMessage;
  }, [sendMessage]);

  // Join game table on WS connect
  useEffect(() => {
    if (isConnected && tableId) {
      sendMessage('RECONNECT_GAME', { tableId });
    }
  }, [isConnected, tableId, sendMessage]);

  const gameOver =
    gameState.phase === GamePhase.Finished || gameState.phase === GamePhase.Cancelled;
  const canRoll = !gameOver && gameState.turn.phase === TurnPhase.WaitingForRoll;
  const canUndo = false;
  const winner = gameState.winner;

  const allLegalMoves = useMemo(() => {
    if (gameOver) return [];
    return validator.getLegalMoves(gameState);
  }, [gameState, validator, gameOver]);

  const legalMoves = useMemo(() => {
    if (selectedPoint === null) return [];
    return allLegalMoves.filter((m) => m.from === selectedPoint);
  }, [allLegalMoves, selectedPoint]);

  const selectChecker = useCallback((pointIndex: number) => {
    setSelectedPoint((prev) => (prev === pointIndex ? null : pointIndex));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  const moveTo = useCallback(
    (target: number) => {
      if (selectedPoint === null) return;
      const allMoves = validator.getLegalMoves(gameState);
      const matchedMove = allMoves.find((m) => m.from === selectedPoint && m.to === target);
      if (!matchedMove) return;

      sendRef.current('MAKE_MOVE', {
        from: matchedMove.from,
        to: matchedMove.to,
        diceUsed: matchedMove.diceUsed,
      });
      setSelectedPoint(null);
    },
    [selectedPoint, gameState, validator],
  );

  const makeMove = useCallback(
    (from: number, to: number) => {
      const allMoves = validator.getLegalMoves(gameState);
      const matchedMove = allMoves.find((m) => m.from === from && m.to === to);
      if (!matchedMove) return;

      sendRef.current('MAKE_MOVE', {
        from: matchedMove.from,
        to: matchedMove.to,
        diceUsed: matchedMove.diceUsed,
      });
      setSelectedPoint(null);
    },
    [gameState, validator],
  );

  const rollDiceAction = useCallback(() => {
    if (!canRoll) return;
    sendRef.current('ROLL_DICE');
    setSelectedPoint(null);
  }, [canRoll]);

  const undo = useCallback(() => {
    // No undo in multiplayer
  }, []);

  const resign = useCallback(() => {
    if (gameOver) return;
    sendRef.current('RESIGN_GAME');
    setSelectedPoint(null);
  }, [gameOver]);

  return {
    gameState,
    selectedPoint,
    legalMoves,
    allLegalMoves,
    canRoll,
    canUndo,
    gameOver,
    winner,
    boardWidth: BOARD_WIDTH,
    checkerPaddingRatio: CHECKER_PADDING_RATIO,
    checkerGap: CHECKER_GAP,
    selectChecker,
    moveTo,
    makeMove,
    rollDiceAction,
    clearSelection,
    undo,
    resign,
    connectionStatus,
    localPlayer,
  };
}
