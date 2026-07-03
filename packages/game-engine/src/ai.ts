import { rollDice } from './Dice';
import type { DiceRoll } from './types';
import {
  setDiceRoll,
  advanceTurn,
  cloneState,
  detectGameEnd,
  detectWinType,
  calculateWinValue,
  completeGame,
} from './GameState';
import { applyMove } from './Move';
import { createValidator } from './Validator';
import { TurnPhase } from './types';
import type { GameState, Move } from './types';

export function getRandomAIMove(
  state: GameState,
  randomFn: () => number = Math.random,
): Move | null {
  const validator = createValidator();
  const moves = validator.getLegalMoves(state);
  if (moves.length === 0) return null;
  return moves[Math.floor(randomFn() * moves.length)];
}

export function executeAITurn(
  state: GameState,
  rollDiceFn: () => DiceRoll = rollDice,
  randomFn: () => number = Math.random,
): GameState {
  let current = cloneState(state);

  const roll = rollDiceFn();
  current = setDiceRoll(current, roll);

  const validator = createValidator();

  while (current.remainingDice.length > 0) {
    const moves = validator.getLegalMoves(current);
    if (moves.length === 0) {
      return advanceTurn(current);
    }

    const move = moves[Math.floor(randomFn() * moves.length)];
    current = applyMove(current, move);

    const gameEnd = detectGameEnd(current);
    if (gameEnd !== null) {
      const winType = detectWinType(current, gameEnd);
      const winValue = calculateWinValue(winType);
      return completeGame(current, gameEnd, winType, winValue);
    }
  }

  current.turn = { ...current.turn, phase: TurnPhase.WaitingForRoll };
  return current;
}
