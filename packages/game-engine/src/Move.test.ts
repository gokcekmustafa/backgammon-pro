import { describe, it, expect } from 'vitest';
import {
  createMove,
  isBarMove,
  isBearOffMove,
  moveUsesDie,
  createBarMove,
  createBearOffMove,
  applyMove,
  undoMove,
} from './Move';
import { createEmptyState } from './GameState';
import { Player } from './types';

const P1 = Player.One;
const P2 = Player.Two;

describe('createMove', () => {
  it('creates a move with given parameters', () => {
    const move = createMove(5, 10, 4, P1);
    expect(move.from).toBe(5);
    expect(move.to).toBe(10);
    expect(move.diceUsed).toBe(4);
    expect(move.player).toBe(P1);
  });
});

describe('isBarMove', () => {
  it('returns true for bar move', () => {
    expect(isBarMove(createMove(-1, 10, 4, P1))).toBe(true);
  });

  it('returns false for normal move', () => {
    expect(isBarMove(createMove(5, 10, 4, P1))).toBe(false);
  });
});

describe('isBearOffMove', () => {
  it('returns true for bear off move', () => {
    expect(isBearOffMove(createMove(5, -1, 4, P1))).toBe(true);
  });

  it('returns false for normal move', () => {
    expect(isBearOffMove(createMove(5, 10, 4, P1))).toBe(false);
  });
});

describe('createBarMove', () => {
  it('creates move from bar', () => {
    const move = createBarMove(10, 3, P1);
    expect(move.from).toBe(-1);
    expect(move.to).toBe(10);
    expect(move.diceUsed).toBe(3);
    expect(move.player).toBe(P1);
  });
});

describe('moveUsesDie', () => {
  it('returns true when diceUsed matches', () => {
    expect(moveUsesDie(createMove(5, 10, 4, P1), 4)).toBe(true);
  });

  it('returns false when diceUsed does not match', () => {
    expect(moveUsesDie(createMove(5, 10, 4, P1), 3)).toBe(false);
  });
});

describe('createBearOffMove', () => {
  it('creates bear off move', () => {
    const move = createBearOffMove(5, 2, P1);
    expect(move.from).toBe(5);
    expect(move.to).toBe(-1);
    expect(move.diceUsed).toBe(2);
    expect(move.player).toBe(P1);
  });
});

describe('applyMove', () => {
  it('moves a checker between points', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 3 };
    state.remainingDice = [4];

    const next = applyMove(state, createMove(5, 9, 4, P1));

    expect(next.board[5].count).toBe(2);
    expect(next.board[5].player).toBe(P1);
    expect(next.board[9].count).toBe(1);
    expect(next.board[9].player).toBe(P1);
  });

  it('removes the used die from remaining dice', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 3 };
    state.remainingDice = [4, 3];

    const next = applyMove(state, createMove(5, 9, 4, P1));
    expect(next.remainingDice).toEqual([3]);
  });

  it('moves checker from bar', () => {
    const state = createEmptyState();
    state.players[0].checkersOnBar = 2;
    state.board[10] = { player: null, count: 0 };
    state.remainingDice = [4];

    const next = applyMove(state, createBarMove(10, 4, P1));
    expect(next.players[0].checkersOnBar).toBe(1);
    expect(next.board[10].count).toBe(1);
    expect(next.board[10].player).toBe(P1);
  });

  it('bears off a checker', () => {
    const state = createEmptyState();
    state.board[23] = { player: P1, count: 3 };
    state.remainingDice = [6];

    const next = applyMove(state, createBearOffMove(23, 6, P1));
    expect(next.board[23].count).toBe(2);
    expect(next.players[0].checkersBorneOff).toBe(1);
  });

  it('switches player when all dice used', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 2 };
    state.remainingDice = [4];

    const next = applyMove(state, createMove(5, 9, 4, P1));
    expect(next.currentPlayer).toBe(P2);
    expect(next.diceRoll).toBeNull();
  });

  it('keeps current player when dice remain', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 2 };
    state.remainingDice = [4, 3];

    const next = applyMove(state, createMove(5, 9, 4, P1));
    expect(next.currentPlayer).toBe(P1);
    expect(next.remainingDice).toEqual([3]);
  });

  it('moves opponent blot to bar on hit', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 3 };
    state.board[9] = { player: P2, count: 1 };
    state.remainingDice = [4];

    const next = applyMove(state, createMove(5, 9, 4, P1));

    expect(next.board[5].count).toBe(2);
    expect(next.board[9].count).toBe(1);
    expect(next.board[9].player).toBe(P1);
    expect(next.players[1].checkersOnBar).toBe(1);
  });

  it('does not move multiple opponent checkers to bar', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 3 };
    state.board[9] = { player: P2, count: 2 };
    state.remainingDice = [4];

    const next = applyMove(state, createMove(5, 9, 4, P1));

    expect(next.board[9].count).toBe(3);
    expect(next.players[1].checkersOnBar).toBe(0);
  });

  it('removes only one checker from source point', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 5 };
    state.remainingDice = [4];

    const next = applyMove(state, createMove(5, 9, 4, P1));
    expect(next.board[5].count).toBe(4);
    expect(next.board[5].player).toBe(P1);
  });

  it('clears source point player when last checker removed', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 1 };
    state.remainingDice = [4];

    const next = applyMove(state, createMove(5, 9, 4, P1));
    expect(next.board[5].count).toBe(0);
    expect(next.board[5].player).toBeNull();
  });

  it('hits opponent blot from bar entry', () => {
    const state = createEmptyState();
    state.players[0].checkersOnBar = 1;
    state.board[0] = { player: P2, count: 1 };
    state.remainingDice = [1];

    const next = applyMove(state, createBarMove(0, 1, P1));
    expect(next.players[0].checkersOnBar).toBe(0);
    expect(next.board[0].player).toBe(P1);
    expect(next.board[0].count).toBe(1);
    expect(next.players[1].checkersOnBar).toBe(1);
  });
});

describe('undoMove', () => {
  it('reverses a point-to-point move', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 3 };
    state.board[9] = { player: null, count: 0 };
    state.remainingDice = [4];

    const applied = applyMove(state, createMove(5, 9, 4, P1));
    const undone = undoMove(applied, createMove(5, 9, 4, P1));

    expect(undone.board[5].count).toBe(3);
    expect(undone.board[5].player).toBe(P1);
    expect(undone.board[9].count).toBe(0);
    expect(undone.board[9].player).toBeNull();
  });

  it('reverses a bar move', () => {
    const state = createEmptyState();
    state.players[0].checkersOnBar = 1;
    state.board[10] = { player: null, count: 0 };
    state.remainingDice = [4];

    const applied = applyMove(state, createBarMove(10, 4, P1));
    const undone = undoMove(applied, createBarMove(10, 4, P1));

    expect(undone.players[0].checkersOnBar).toBe(1);
    expect(undone.board[10].count).toBe(0);
  });

  it('reverses a bear off move', () => {
    const state = createEmptyState();
    state.board[23] = { player: P1, count: 3 };
    state.remainingDice = [6];

    const applied = applyMove(state, createBearOffMove(23, 6, P1));
    const undone = undoMove(applied, createBearOffMove(23, 6, P1));

    expect(undone.board[23].count).toBe(3);
    expect(undone.players[0].checkersBorneOff).toBe(0);
  });

  it('restores dice', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 2 };
    state.remainingDice = [4];

    const applied = applyMove(state, createMove(5, 9, 4, P1));
    const undone = undoMove(applied, createMove(5, 9, 4, P1));

    expect(undone.remainingDice).toEqual([4]);
  });

  it('restores current player when dice were exhausted', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 2 };
    state.remainingDice = [4];

    const applied = applyMove(state, createMove(5, 9, 4, P1));
    expect(applied.currentPlayer).toBe(P2);

    const undone = undoMove(applied, createMove(5, 9, 4, P1));
    expect(undone.currentPlayer).toBe(P1);
  });

  it('reverses a hit (restores opponent blot)', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 3 };
    state.board[9] = { player: P2, count: 1 };
    state.remainingDice = [4];

    const applied = applyMove(state, createMove(5, 9, 4, P1, true));
    const undone = undoMove(applied, createMove(5, 9, 4, P1, true));

    expect(undone.board[5].count).toBe(3);
    expect(undone.board[9].count).toBe(1);
    expect(undone.board[9].player).toBe(P2);
    expect(undone.players[1].checkersOnBar).toBe(0);
  });

  it('does not mutate the input state', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 3 };
    state.remainingDice = [4];

    const stateBefore = { ...state, board: [...state.board.map((p) => ({ ...p }))] };
    const applied = applyMove(state, createMove(5, 9, 4, P1));
    undoMove(applied, createMove(5, 9, 4, P1));

    expect(state.board[5].count).toBe(stateBefore.board[5].count);
  });

  it('reverses a bar entry with hit', () => {
    const state = createEmptyState();
    state.players[0].checkersOnBar = 1;
    state.board[0] = { player: P2, count: 1 };
    state.remainingDice = [1];

    const applied = applyMove(state, createBarMove(0, 1, P1));
    const hitMove = createMove(-1, 0, 1, P1, true);
    const undone = undoMove(applied, hitMove);

    expect(undone.players[0].checkersOnBar).toBe(1);
    expect(undone.board[0].player).toBe(P2);
    expect(undone.board[0].count).toBe(1);
    expect(undone.players[1].checkersOnBar).toBe(0);
  });

  it('does not restore blot when wasHit flag is not set', () => {
    const state = createEmptyState();
    state.board[5] = { player: P1, count: 3 };
    state.board[9] = { player: P2, count: 1 };
    state.remainingDice = [4];

    const applied = applyMove(state, createMove(5, 9, 4, P1));
    const undone = undoMove(applied, createMove(5, 9, 4, P1));

    // Without wasHit flag, undoMove cannot know to restore the blot
    // P1 checker is removed from destination, blot not restored, P2 stays on bar
    expect(undone.board[5].count).toBe(3);
    expect(undone.board[9].count).toBe(0);
    expect(undone.board[9].player).toBeNull();
    expect(undone.players[1].checkersOnBar).toBe(1);
  });
});
