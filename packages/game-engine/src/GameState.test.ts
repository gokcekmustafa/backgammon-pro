import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  createInitialBoard,
  createEmptyState,
  createInitialState,
  cloneState,
  setCurrentPlayer,
  setDiceRoll,
  advanceTurn,
  completeGame,
  cancelGame,
  countCheckersOnBoard,
  isAllCheckersInHomeBoard,
  setRemainingDice,
  detectGameEnd,
  detectWinType,
  calculateWinValue,
  resignGame,
  TOTAL_POINTS,
  TOTAL_CHECKERS_PER_PLAYER,
  NORMAL_WIN_VALUE,
  GAMMON_WIN_VALUE,
  BACKGAMMON_WIN_VALUE,
} from './GameState';
import { Player, GamePhase, TurnPhase, WinType } from './types';

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

describe('setRemainingDice', () => {
  it('sets remaining dice without mutation', () => {
    const state = createEmptyState();
    state.remainingDice = [3, 1];
    const next = setRemainingDice(state, [6, 6, 6, 6]);
    expect(next.remainingDice).toEqual([6, 6, 6, 6]);
    expect(state.remainingDice).toEqual([3, 1]);
  });
});

describe('completeGame', () => {
  it('sets phase to finished', () => {
    const state = createEmptyState();
    const next = completeGame(state, Player.One, WinType.Normal, 1);
    expect(next.phase).toBe(GamePhase.Finished);
    expect(next.winner).toBe(Player.One);
    expect(next.winType).toBe(WinType.Normal);
  });

  it('sets winType to enum value', () => {
    const state = createEmptyState();
    const next = completeGame(state, Player.Two, WinType.Gammon, 2);
    expect(next.winType).toBe(WinType.Gammon);
  });

  it('does not mutate original state', () => {
    const state = createEmptyState();
    completeGame(state, Player.One, WinType.Normal, 1);
    expect(state.phase).toBe(GamePhase.NotStarted);
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

  it('does not count opponent checkers', () => {
    const state = createEmptyState();
    state.board[0] = { player: Player.One, count: 3 };
    state.board[5] = { player: Player.Two, count: 2 };
    expect(countCheckersOnBoard(state, Player.One)).toBe(3);
    expect(countCheckersOnBoard(state, Player.Two)).toBe(2);
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

  it('returns true for P2 when all checkers in P2 home', () => {
    const state = createEmptyState();
    state.board[0] = { player: Player.Two, count: 5 };
    state.board[5] = { player: Player.Two, count: 10 };
    expect(isAllCheckersInHomeBoard(state, Player.Two)).toBe(true);
  });

  it('returns false for P2 when checker is outside home board', () => {
    const state = createEmptyState();
    state.board[0] = { player: Player.Two, count: 14 };
    state.board[20] = { player: Player.Two, count: 1 };
    expect(isAllCheckersInHomeBoard(state, Player.Two)).toBe(false);
  });

  it('returns false for P2 when checker is on bar', () => {
    const state = createEmptyState();
    state.board[0] = { player: Player.Two, count: 14 };
    state.players[1].checkersOnBar = 1;
    expect(isAllCheckersInHomeBoard(state, Player.Two)).toBe(false);
  });
});

describe('createInitialBoard', () => {
  it('places 2 Player One checkers on point 0 (standard 24)', () => {
    const board = createInitialBoard();
    expect(board[0].player).toBe(Player.One);
    expect(board[0].count).toBe(2);
  });

  it('places 5 Player One checkers on point 11 (standard 13)', () => {
    const board = createInitialBoard();
    expect(board[11].player).toBe(Player.One);
    expect(board[11].count).toBe(5);
  });

  it('places 3 Player One checkers on point 16 (standard 8)', () => {
    const board = createInitialBoard();
    expect(board[16].player).toBe(Player.One);
    expect(board[16].count).toBe(3);
  });

  it('places 5 Player One checkers on point 18 (standard 6)', () => {
    const board = createInitialBoard();
    expect(board[18].player).toBe(Player.One);
    expect(board[18].count).toBe(5);
  });

  it('places 2 Player Two checkers on point 23 (standard 1)', () => {
    const board = createInitialBoard();
    expect(board[23].player).toBe(Player.Two);
    expect(board[23].count).toBe(2);
  });

  it('places 5 Player Two checkers on point 12 (standard 12)', () => {
    const board = createInitialBoard();
    expect(board[12].player).toBe(Player.Two);
    expect(board[12].count).toBe(5);
  });

  it('places 3 Player Two checkers on point 17 (standard 7)', () => {
    const board = createInitialBoard();
    expect(board[17].player).toBe(Player.Two);
    expect(board[17].count).toBe(3);
  });

  it('places 5 Player Two checkers on point 5 (standard 19)', () => {
    const board = createInitialBoard();
    expect(board[5].player).toBe(Player.Two);
    expect(board[5].count).toBe(5);
  });

  it('has 15 checkers per player total', () => {
    const board = createInitialBoard();
    let p1 = 0;
    let p2 = 0;
    for (const point of board) {
      if (point.player === Player.One) p1 += point.count;
      if (point.player === Player.Two) p2 += point.count;
    }
    expect(p1).toBe(TOTAL_CHECKERS_PER_PLAYER);
    expect(p2).toBe(TOTAL_CHECKERS_PER_PLAYER);
  });
});

describe('createInitialState', () => {
  it('creates a state with initial board', () => {
    const state = createInitialState();
    expect(state.phase).toBe(GamePhase.Playing);
    expect(state.currentPlayer).toBe(Player.One);
    expect(state.players[0].checkersOnBar).toBe(0);
    expect(state.players[0].checkersBorneOff).toBe(0);
    expect(state.players[1].checkersOnBar).toBe(0);
    expect(state.players[1].checkersBorneOff).toBe(0);
  });
});

// ── detectGameEnd ──────────────────────────────────────────────────────

describe('detectGameEnd', () => {
  it('returns null when no player has borne off all checkers', () => {
    const state = createEmptyState();
    expect(detectGameEnd(state)).toBeNull();
  });

  it('returns Player.One when P1 has borne off 15 checkers', () => {
    const state = createEmptyState();
    state.players[0].checkersBorneOff = 15;
    expect(detectGameEnd(state)).toBe(Player.One);
  });

  it('returns Player.Two when P2 has borne off 15 checkers', () => {
    const state = createEmptyState();
    state.players[1].checkersBorneOff = 15;
    expect(detectGameEnd(state)).toBe(Player.Two);
  });

  it('returns null when borne off count is 14', () => {
    const state = createEmptyState();
    state.players[0].checkersBorneOff = 14;
    expect(detectGameEnd(state)).toBeNull();
  });

  it('returns P1 when both players have 15+ borne off (P1 checked first)', () => {
    const state = createEmptyState();
    state.players[0].checkersBorneOff = 15;
    state.players[1].checkersBorneOff = 15;
    expect(detectGameEnd(state)).toBe(Player.One);
  });
});

// ── detectWinType ──────────────────────────────────────────────────────

describe('detectWinType', () => {
  it('returns normal when loser has borne off at least one checker', () => {
    const state = createEmptyState();
    state.players[1].checkersBorneOff = 1;
    expect(detectWinType(state, Player.One)).toBe(WinType.Normal);
  });

  it('returns gammon when loser has zero borne off and no checkers in winners home or bar', () => {
    const state = createEmptyState();
    state.board[10] = { player: Player.Two, count: 5 };
    expect(detectWinType(state, Player.One)).toBe(WinType.Gammon);
  });

  it('returns backgammon when loser has checkers on bar', () => {
    const state = createEmptyState();
    state.players[1].checkersOnBar = 1;
    expect(detectWinType(state, Player.One)).toBe(WinType.Backgammon);
  });

  it('returns backgammon when loser has checkers in winners home board', () => {
    const state = createEmptyState();
    // P1's home is 18-23, place a P2 checker there
    state.board[20] = { player: Player.Two, count: 1 };
    expect(detectWinType(state, Player.One)).toBe(WinType.Backgammon);
  });

  it('detects backgammon for P1 losing with checkers in P2 home', () => {
    const state = createEmptyState();
    // P2's home is 0-5, place a P1 checker there
    state.board[3] = { player: Player.One, count: 1 };
    expect(detectWinType(state, Player.Two)).toBe(WinType.Backgammon);
  });
});

// ── calculateWinValue ──────────────────────────────────────────────────

describe('calculateWinValue', () => {
  it('returns 1 for normal win', () => {
    expect(calculateWinValue(WinType.Normal)).toBe(NORMAL_WIN_VALUE);
  });

  it('returns 2 for gammon', () => {
    expect(calculateWinValue(WinType.Gammon)).toBe(GAMMON_WIN_VALUE);
  });

  it('returns 3 for backgammon', () => {
    expect(calculateWinValue(WinType.Backgammon)).toBe(BACKGAMMON_WIN_VALUE);
  });

  it('returns 1 for resignation', () => {
    expect(calculateWinValue(WinType.Resignation)).toBe(NORMAL_WIN_VALUE);
  });
});

// ── resignGame ─────────────────────────────────────────────────────────

describe('resignGame', () => {
  it('finishes the game with opponent as winner', () => {
    const state = createEmptyState();
    const result = resignGame(state, Player.One);
    expect(result.phase).toBe(GamePhase.Finished);
    expect(result.winner).toBe(Player.Two);
    expect(result.winType).toBe(WinType.Resignation);
  });

  it('clones the state', () => {
    const state = createEmptyState();
    const result = resignGame(state, Player.One);
    expect(result).not.toBe(state);
  });
});
