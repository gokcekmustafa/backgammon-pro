import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  createEmptyState,
  cloneState,
  setCurrentPlayer,
  setDiceRoll,
  advanceTurn,
  completeGame,
  cancelGame,
  countCheckersOnBoard,
  isAllCheckersInHomeBoard,
  TOTAL_POINTS,
} from './GameState';
import { Player, GamePhase, TurnPhase } from './types';

describe('createEmptyBoard', () => {
  it('creates 24 empty points', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(TOTAL_POINTS);
    board.forEach((point) => {
      expect(point.player).toBeNull();
      expect(point.count).toBe(0);
    });
  });
});

describe('createEmptyState', () => {
  it('creates state with empty board', () => {
    const state = createEmptyState();
    expect(state.board).toHaveLength(TOTAL_POINTS);
    expect(state.phase).toBe(GamePhase.NotStarted);
  });

  it('sets initial player to One', () => {
    const state = createEmptyState();
    expect(state.currentPlayer).toBe(Player.One);
  });

  it('initializes doubling cube', () => {
    const state = createEmptyState();
    expect(state.doublingCube.value).toBe(1);
    expect(state.doublingCube.owner).toBeNull();
  });

  it('initializes turn state', () => {
    const state = createEmptyState();
    expect(state.turn.number).toBe(0);
    expect(state.turn.phase).toBe(TurnPhase.WaitingForRoll);
  });

  it('creates two empty player states', () => {
    const state = createEmptyState();
    expect(state.players[0].checkersOnBar).toBe(0);
    expect(state.players[0].checkersBorneOff).toBe(0);
    expect(state.players[1].checkersOnBar).toBe(0);
    expect(state.players[1].checkersBorneOff).toBe(0);
  });
});

describe('cloneState', () => {
  it('creates an independent copy', () => {
    const original = createEmptyState();
    const cloned = cloneState(original);
    cloned.board[0].count = 5;
    expect(original.board[0].count).toBe(0);
  });
});

describe('setCurrentPlayer', () => {
  it('changes current player', () => {
    const state = createEmptyState();
    const next = setCurrentPlayer(state, Player.Two);
    expect(next.currentPlayer).toBe(Player.Two);
    expect(state.currentPlayer).toBe(Player.One);
  });
});

describe('setDiceRoll', () => {
  it('sets dice and remaining dice', () => {
    const state = createEmptyState();
    const next = setDiceRoll(state, { die1: 4, die2: 3, isDouble: false });
    expect(next.diceRoll).toEqual({ die1: 4, die2: 3, isDouble: false });
    expect(next.remainingDice).toEqual([4, 3]);
  });

  it('handles doubles with four dice', () => {
    const state = createEmptyState();
    const next = setDiceRoll(state, { die1: 5, die2: 5, isDouble: true });
    expect(next.remainingDice).toEqual([5, 5, 5, 5]);
  });

  it('transitions to WaitingForMove', () => {
    const state = createEmptyState();
    const next = setDiceRoll(state, { die1: 2, die2: 1, isDouble: false });
    expect(next.turn.phase).toBe(TurnPhase.WaitingForMove);
    expect(next.turn.number).toBe(1);
  });

  it('sets phase to Playing', () => {
    const state = createEmptyState();
    const next = setDiceRoll(state, { die1: 3, die2: 3, isDouble: true });
    expect(next.phase).toBe(GamePhase.Playing);
  });
});

describe('advanceTurn', () => {
  it('switches to the other player', () => {
    const state = createEmptyState();
    const next = advanceTurn(state);
    expect(next.currentPlayer).toBe(Player.Two);
  });

  it('clears dice', () => {
    const state = createEmptyState();
    const next = advanceTurn(state);
    expect(next.diceRoll).toBeNull();
    expect(next.remainingDice).toEqual([]);
  });

  it('resets turn to waiting for roll', () => {
    const state = createEmptyState();
    const next = advanceTurn(state);
    expect(next.turn.phase).toBe(TurnPhase.WaitingForRoll);
  });
});

describe('completeGame', () => {
  it('sets phase to finished', () => {
    const state = createEmptyState();
    const next = completeGame(state, Player.One, 'normal', 1);
    expect(next.phase).toBe(GamePhase.Finished);
    expect(next.winner).toBe(Player.One);
    expect(next.winType).toBe('normal');
  });
});

describe('cancelGame', () => {
  it('sets phase to cancelled', () => {
    const state = createEmptyState();
    const next = cancelGame(state);
    expect(next.phase).toBe(GamePhase.Cancelled);
  });
});

describe('countCheckersOnBoard', () => {
  it('returns 0 for empty board', () => {
    const state = createEmptyState();
    expect(countCheckersOnBoard(state, Player.One)).toBe(0);
  });

  it('counts checkers on points, bar, and borne off', () => {
    const state = createEmptyState();
    state.board[0] = { player: Player.One, count: 3 };
    state.board[5] = { player: Player.One, count: 2 };
    state.players[0].checkersOnBar = 1;
    state.players[0].checkersBorneOff = 4;
    expect(countCheckersOnBoard(state, Player.One)).toBe(10);
  });
});

describe('isAllCheckersInHomeBoard', () => {
  it('returns true when all checkers in home board', () => {
    const state = createEmptyState();
    state.board[18] = { player: Player.One, count: 5 };
    state.board[23] = { player: Player.One, count: 10 };
    expect(isAllCheckersInHomeBoard(state, Player.One)).toBe(true);
  });

  it('returns false when checker is on bar', () => {
    const state = createEmptyState();
    state.board[18] = { player: Player.One, count: 15 };
    state.players[0].checkersOnBar = 1;
    expect(isAllCheckersInHomeBoard(state, Player.One)).toBe(false);
  });

  it('returns false when checker is outside home board', () => {
    const state = createEmptyState();
    state.board[0] = { player: Player.One, count: 1 };
    state.board[18] = { player: Player.One, count: 14 };
    expect(isAllCheckersInHomeBoard(state, Player.One)).toBe(false);
  });
});
