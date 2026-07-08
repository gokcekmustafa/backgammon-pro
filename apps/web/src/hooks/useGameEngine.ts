'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  createInitialState,
  setDiceRoll,
  applyMove,
  undoMove,
  createValidator,
  rollDice,
  detectGameEnd,
  detectWinType,
  advanceTurn,
  resignGame,
  executeAITurn,
} from '@backgammon/game-engine';
import { Player, GamePhase, TurnPhase } from '@backgammon/game-engine';
import type { GameState, Move } from '@backgammon/game-engine';

const BOARD_WIDTH = 620;
const CHECKER_PADDING_RATIO = 0.85;
const CHECKER_GAP = 1;

export interface UseGameEngineReturn {
  gameState: GameState;
  selectedPoint: number | null;
  legalMoves: Move[];
  allLegalMoves: Move[];
  canRoll: boolean;
  canUndo: boolean;
  gameOver: boolean;
  winner: Player | null;
  boardWidth: number;
  checkerPaddingRatio: number;
  checkerGap: number;
  selectChecker: (pointIndex: number) => void;
  moveTo: (target: number) => void;
  makeMove: (from: number, to: number) => void;
  rollDiceAction: () => void;
  clearSelection: () => void;
  undo: () => void;
  resign: () => void;
}

export function useGameEngine(aiMode?: boolean): UseGameEngineReturn {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);

  const validator = useMemo(() => createValidator(), []);

  const gameOver =
    gameState.phase === GamePhase.Finished || gameState.phase === GamePhase.Cancelled;
  const canRoll = !gameOver && gameState.turn.phase === TurnPhase.WaitingForRoll;
  const canUndo = !gameOver && moveHistory.length > 0 && !aiMode;

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

      const nextState = applyMove(gameState, matchedMove);
      setMoveHistory((prev) => [...prev, matchedMove]);
      setSelectedPoint(null);

      const gameEnd = detectGameEnd(nextState);
      if (gameEnd !== null) {
        const winType = detectWinType(nextState, gameEnd);
        setGameState({
          ...nextState,
          phase: GamePhase.Finished,
          winner: gameEnd,
          winType,
        });
        return;
      }

      if (nextState.remainingDice.length > 0) {
        const hasMoves = validator.hasLegalMoves(nextState);
        if (!hasMoves) {
          setGameState(advanceTurn(nextState));
          return;
        }
      }

      setGameState(nextState);
    },
    [gameState, selectedPoint, validator],
  );

  const rollDiceAction = useCallback(() => {
    if (!canRoll) return;
    const roll = rollDice();
    setGameState((prev) => setDiceRoll(prev, roll));
    setSelectedPoint(null);
  }, [canRoll]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const lastMove = moveHistory[moveHistory.length - 1];
    setGameState((prev) => undoMove(prev, lastMove));
    setMoveHistory((prev) => prev.slice(0, -1));
    setSelectedPoint(null);
  }, [canUndo, moveHistory]);

  const makeMove = useCallback(
    (from: number, to: number) => {
      const allMoves = validator.getLegalMoves(gameState);
      const matchedMove = allMoves.find((m) => m.from === from && m.to === to);
      if (!matchedMove) return;

      const nextState = applyMove(gameState, matchedMove);
      setMoveHistory((prev) => [...prev, matchedMove]);
      setSelectedPoint(null);

      const gameEnd = detectGameEnd(nextState);
      if (gameEnd !== null) {
        const winType = detectWinType(nextState, gameEnd);
        setGameState({
          ...nextState,
          phase: GamePhase.Finished,
          winner: gameEnd,
          winType,
        });
        return;
      }

      if (nextState.remainingDice.length > 0) {
        const hasMoves = validator.hasLegalMoves(nextState);
        if (!hasMoves) {
          setGameState(advanceTurn(nextState));
          return;
        }
      }

      setGameState(nextState);
    },
    [gameState, validator],
  );

  const resign = useCallback(() => {
    if (gameOver) return;
    setGameState((prev) => resignGame(prev, prev.currentPlayer));
    setSelectedPoint(null);
  }, [gameOver]);

  // AI auto-play effect
  useEffect(() => {
    if (!aiMode) return;
    if (gameOver) return;
    if (gameState.currentPlayer !== Player.Two) return;

    const timer = setTimeout(() => {
      const result = executeAITurn(gameState);
      setGameState(result);
      setMoveHistory([]);
    }, 600);

    return () => clearTimeout(timer);
  }, [aiMode, gameOver, gameState]);

  return {
    gameState,
    selectedPoint,
    legalMoves,
    allLegalMoves,
    canRoll,
    canUndo,
    gameOver,
    winner: gameState.winner,
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
  };
}
