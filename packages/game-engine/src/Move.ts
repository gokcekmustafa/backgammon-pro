import type { GameState, Move, Player } from './types';
import { playerToIndex, opponent } from './types';
import { cloneState } from './GameState';
import { removeDie } from './Dice';

export const BAR_INDEX = -1;
export const BEAR_OFF_INDEX = -1;

export function createMove(
  from: number,
  to: number,
  diceUsed: number,
  player: Player,
  wasHit?: boolean,
): Move {
  return { from, to, diceUsed, player, wasHit };
}

export function isBarMove(move: Move): boolean {
  return move.from === BAR_INDEX;
}

export function isBearOffMove(move: Move): boolean {
  return move.to === BEAR_OFF_INDEX;
}

export function moveUsesDie(move: Move, dieValue: number): boolean {
  return move.diceUsed === dieValue;
}

export function createBarMove(to: number, diceUsed: number, player: Player): Move {
  return { from: BAR_INDEX, to, diceUsed, player };
}

export function createBearOffMove(from: number, diceUsed: number, player: Player): Move {
  return { from, to: BEAR_OFF_INDEX, diceUsed, player };
}

function removeFromPoint(state: GameState, pointIndex: number): void {
  const point = state.board[pointIndex];
  point.count -= 1;
  if (point.count <= 0) {
    point.count = 0;
    point.player = null;
  }
}

function addToPoint(state: GameState, pointIndex: number, player: Player): void {
  const point = state.board[pointIndex];
  point.count += 1;
  point.player = player;
}

export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const player = move.player;
  const playerIdx = playerToIndex(player);
  const oppIdx = playerToIndex(opponent(player));

  if (isBarMove(move)) {
    next.players[playerIdx].checkersOnBar -= 1;
  } else {
    removeFromPoint(next, move.from);
  }

  if (!isBearOffMove(move)) {
    const dest = next.board[move.to];
    if (dest.player === opponent(player) && dest.count === 1) {
      dest.count = 0;
      dest.player = null;
      next.players[oppIdx].checkersOnBar += 1;
    }
  }

  if (isBearOffMove(move)) {
    next.players[playerIdx].checkersBorneOff += 1;
  } else {
    addToPoint(next, move.to, player);
  }

  next.remainingDice = removeDie(next.remainingDice, move.diceUsed);

  if (next.remainingDice.length === 0) {
    next.currentPlayer = opponent(player);
    next.diceRoll = null;
  }

  return next;
}

export function undoMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const player = move.player;
  const playerIdx = playerToIndex(player);
  const oppIdx = playerToIndex(opponent(player));

  if (isBearOffMove(move)) {
    next.players[playerIdx].checkersBorneOff -= 1;
  } else {
    removeFromPoint(next, move.to);
  }

  if (move.wasHit) {
    next.players[oppIdx].checkersOnBar -= 1;
    addToPoint(next, move.to, opponent(player));
  }

  if (isBarMove(move)) {
    next.players[playerIdx].checkersOnBar += 1;
  } else {
    addToPoint(next, move.from, player);
  }

  next.remainingDice = [...next.remainingDice, move.diceUsed].sort((a, b) => a - b);

  if (next.remainingDice.length > 0) {
    next.currentPlayer = player;
  }

  return next;
}
