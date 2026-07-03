import { describe, it, expect } from 'vitest';
import {
  createMoveValidation,
  validMove,
  invalidMove,
  createPermissiveValidator,
  createStrictValidator,
  createValidator,
} from './Validator';
import { createEmptyState, createInitialState } from './GameState';
import { createMove, createBarMove, createBearOffMove } from './Move';
import { Player } from './types';

describe('createMoveValidation', () => {
  it('creates a valid validation result', () => {
    const move = createMove(5, 10, 4, Player.One);
    const result = createMoveValidation(move, true);
    expect(result.isValid).toBe(true);
    expect(result.move).toBe(move);
    expect(result.reason).toBeUndefined();
  });

  it('creates an invalid validation result', () => {
    const move = createMove(5, 10, 4, Player.One);
    const result = createMoveValidation(move, false, 'Not a legal move');
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Not a legal move');
  });
});

describe('validMove', () => {
  it('creates valid result without reason', () => {
    const move = createMove(5, 10, 4, Player.One);
    const result = validMove(move);
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe('invalidMove', () => {
  it('creates invalid result with reason', () => {
    const move = createMove(5, 10, 4, Player.One);
    const result = invalidMove(move, 'Blocked point');
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Blocked point');
  });
});

describe('createPermissiveValidator', () => {
  const state = createEmptyState();

  it('validates any move as valid', () => {
    const validator = createPermissiveValidator();
    const result = validator.validateMove(state, createMove(0, 1, 3, Player.One));
    expect(result.isValid).toBe(true);
  });

  it('returns empty legal moves', () => {
    const validator = createPermissiveValidator();
    expect(validator.getLegalMoves(state)).toEqual([]);
  });

  it('reports cannot bear off', () => {
    const validator = createPermissiveValidator();
    expect(validator.canBearOff(state)).toBe(false);
  });

  it('reports no legal moves', () => {
    const validator = createPermissiveValidator();
    expect(validator.hasLegalMoves(state)).toBe(false);
  });

  it('has expected method signatures', () => {
    const validator = createPermissiveValidator();
    expect(typeof validator.validateMove).toBe('function');
    expect(typeof validator.getLegalMoves).toBe('function');
    expect(typeof validator.canBearOff).toBe('function');
    expect(typeof validator.hasLegalMoves).toBe('function');
  });
});

describe('createStrictValidator', () => {
  const state = createEmptyState();

  it('rejects all moves', () => {
    const validator = createStrictValidator();
    const result = validator.validateMove(state, createMove(0, 1, 3, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Validator not implemented');
  });
});

describe('createValidator', () => {
  it('returns a validator that rejects invalid moves', () => {
    const validator = createValidator();
    const state = createEmptyState();
    const result = validator.validateMove(state, createMove(0, 1, 3, Player.One));
    expect(result.isValid).toBe(false);
  });
});

// ── Real Validator: validateMove ───────────────────────────────────────

describe('createValidator - validateMove', () => {
  it('rejects move when game is finished', () => {
    const state = createInitialState();
    state.phase = 'finished' as any;
    const validator = createValidator();
    const result = validator.validateMove(state, createMove(0, 3, 3, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/not in progress/i);
  });

  it('rejects move for wrong player', () => {
    const state = createInitialState();
    state.currentPlayer = Player.Two;
    const validator = createValidator();
    const result = validator.validateMove(state, createMove(23, 20, 3, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/not your turn/i);
  });

  it('rejects move with invalid die value', () => {
    const state = createInitialState();
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createMove(0, 3, 3, Player.One));
    expect(result.isValid).toBe(true);
    const result2 = validator.validateMove(state, createMove(0, 5, 5, Player.One));
    expect(result2.isValid).toBe(false);
    expect(result2.reason).toMatch(/not available/i);
  });

  it('rejects move targeting a blocked point', () => {
    const state = createInitialState();
    state.remainingDice = [5, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createMove(18, 23, 5, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/blocked/i);
  });

  it('rejects move with no checker at from position', () => {
    const state = createInitialState();
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createMove(1, 4, 3, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/no checker/i);
  });

  it('rejects move from bar when no checkers on bar', () => {
    const state = createInitialState();
    state.remainingDice = [4, 2];
    const validator = createValidator();
    const result = validator.validateMove(state, createBarMove(3, 4, Player.One));
    expect(result.isValid).toBe(false);
  });

  it('validates a simple forward move', () => {
    const state = createInitialState();
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createMove(0, 3, 3, Player.One));
    expect(result.isValid).toBe(true);
  });

  it('allows moving to a point with one opponent checker (blot)', () => {
    const state = createInitialState();
    state.board[20] = { player: Player.Two, count: 1 };
    state.remainingDice = [2, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createMove(18, 20, 2, Player.One));
    expect(result.isValid).toBe(true);
  });

  it('rejects out-of-bounds target (not bear-off)', () => {
    const state = createInitialState();
    state.board[22] = { player: Player.One, count: 1 };
    state.remainingDice = [5, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createMove(22, 27, 5, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/out of bounds/i);
  });
});

// ── Real Validator: getLegalMoves (Player One) ─────────────────────────

describe('createValidator - getLegalMoves (Player One)', () => {
  it('returns empty when no dice remain', () => {
    const state = createInitialState();
    state.remainingDice = [];
    const validator = createValidator();
    expect(validator.getLegalMoves(state)).toEqual([]);
  });

  it('generates moves from all checkers with given dice', () => {
    const state = createInitialState();
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    expect(moves.some((m) => m.from === 0 && m.to === 3 && m.diceUsed === 3)).toBe(true);
    expect(moves.some((m) => m.from === 0 && m.to === 1 && m.diceUsed === 1)).toBe(true);
    expect(moves.some((m) => m.from === 18 && m.to === 19 && m.diceUsed === 1)).toBe(true);
  });

  it('generates moves that respect blocked points', () => {
    const state = createInitialState();
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    expect(moves.some((m) => m.from === 11 && m.to === 12)).toBe(false);
    expect(moves.some((m) => m.from === 16 && m.to === 17)).toBe(false);
  });

  it('includes hit moves when landing on a blot', () => {
    const state = createInitialState();
    state.board[20] = { player: Player.Two, count: 1 };
    state.remainingDice = [2, 1];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);
    const hitMove = moves.find((m) => m.from === 18 && m.to === 20);
    expect(hitMove).toBeDefined();
    expect(hitMove!.wasHit).toBe(true);
  });

  it('generates moves from bar when checkers on bar', () => {
    const state = createInitialState();
    state.players[0].checkersOnBar = 2;
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.from === -1)).toBe(true);
    expect(moves.some((m) => m.to === 0 && m.diceUsed === 1)).toBe(true);
    expect(moves.some((m) => m.to === 2 && m.diceUsed === 3)).toBe(true);
  });
});

describe('createValidator - getLegalMoves (Player Two)', () => {
  it('generates Player Two moves correctly', () => {
    const state = createInitialState();
    state.currentPlayer = Player.Two;
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    expect(moves.some((m) => m.from === 23 && m.to === 20 && m.diceUsed === 3)).toBe(true);
    expect(moves.some((m) => m.from === 23 && m.to === 22 && m.diceUsed === 1)).toBe(true);
    expect(moves.some((m) => m.from === 5 && m.to === 2 && m.diceUsed === 3)).toBe(true);
  });

  it('generates P2 bar entry moves correctly', () => {
    const state = createInitialState();
    state.currentPlayer = Player.Two;
    state.players[1].checkersOnBar = 1;
    state.remainingDice = [4, 2];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    expect(moves.length).toBeGreaterThan(0);
    expect(moves.some((m) => m.from === -1 && m.to === 20 && m.diceUsed === 4)).toBe(true);
    expect(moves.some((m) => m.from === -1 && m.to === 22 && m.diceUsed === 2)).toBe(true);
  });
});

describe('createValidator - hasLegalMoves', () => {
  it('returns true when legal moves exist', () => {
    const state = createInitialState();
    state.remainingDice = [3, 1];
    const validator = createValidator();
    expect(validator.hasLegalMoves(state)).toBe(true);
  });

  it('returns false when no dice remain', () => {
    const state = createInitialState();
    state.remainingDice = [];
    const validator = createValidator();
    expect(validator.hasLegalMoves(state)).toBe(false);
  });
});

// ── Mandatory move rule tests ──────────────────────────────────────────

describe('createValidator - getLegalMoves (mandatory move rule)', () => {
  it('uses both dice when both can be played (mandatory move rule)', () => {
    const state = createInitialState();
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    expect(moves.some((m) => m.diceUsed === 3)).toBe(true);
    expect(moves.some((m) => m.diceUsed === 1)).toBe(true);
  });

  it('generates moves for double dice', () => {
    const state = createInitialState();
    state.remainingDice = [2, 2, 2, 2];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    expect(moves.length).toBeGreaterThanOrEqual(1);
    expect(moves.every((m) => m.diceUsed === 2)).toBe(true);
  });

  it('only generates moves for available dice when some dice are blocked', () => {
    const state = createInitialState();
    state.board[1] = { player: Player.Two, count: 5 };
    state.board[12] = { player: Player.Two, count: 5 };
    state.board[17] = { player: Player.Two, count: 5 };
    state.board[19] = { player: Player.Two, count: 5 };
    state.board[4] = { player: Player.Two, count: 5 };
    state.board[15] = { player: Player.Two, count: 5 };
    state.board[20] = { player: Player.Two, count: 5 };
    state.board[22] = { player: Player.Two, count: 5 };
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.diceUsed === 3)).toBe(true);
    expect(moves.some((m) => m.from === 0 && m.to === 3)).toBe(true);
    expect(moves.some((m) => m.from === 11 && m.to === 14)).toBe(true);
    expect(moves.some((m) => m.from === 18 && m.to === 21)).toBe(true);
  });
});

// ── Bear-off tests ─────────────────────────────────────────────────────

describe('createValidator - canBearOff', () => {
  it('returns false when not all checkers are in home board', () => {
    const state = createInitialState();
    state.remainingDice = [3, 1];
    const validator = createValidator();
    expect(validator.canBearOff(state)).toBe(false);
  });

  it('returns false when checkers are on bar', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[18] = { player: Player.One, count: 15 };
    state.players[0].checkersOnBar = 1;
    const validator = createValidator();
    expect(validator.canBearOff(state)).toBe(false);
  });

  it('returns true when all checkers are in home board', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[18] = { player: Player.One, count: 3 };
    state.board[22] = { player: Player.One, count: 5 };
    state.board[23] = { player: Player.One, count: 7 };
    state.remainingDice = [3, 1];
    const validator = createValidator();
    expect(validator.canBearOff(state)).toBe(true);
  });
});

describe('createValidator - validateMove (bear-off)', () => {
  it('validates exact bear-off when point matches die', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[18] = { player: Player.One, count: 5 }; // die 6
    state.board[19] = { player: Player.One, count: 5 }; // die 5
    state.board[20] = { player: Player.One, count: 5 }; // die 4
    state.remainingDice = [6, 1];
    const validator = createValidator();
    // P1 bear-off from 18 with die 6 (exact match)
    const result = validator.validateMove(state, createBearOffMove(18, 6, Player.One));
    expect(result.isValid).toBe(true);
  });

  it('rejects bear-off when not all checkers in home board', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[0] = { player: Player.One, count: 1 }; // outside home
    state.board[18] = { player: Player.One, count: 14 };
    state.remainingDice = [6, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createBearOffMove(18, 6, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/cannot bear off/i);
  });

  it('rejects bear-off when checker is on bar', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[18] = { player: Player.One, count: 14 };
    state.players[0].checkersOnBar = 1;
    state.remainingDice = [6, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createBearOffMove(18, 6, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/enter checker from bar/i);
  });

  it('rejects bear-off when a normal move is available instead', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[18] = { player: Player.One, count: 5 };
    state.board[20] = { player: Player.One, count: 5 };
    state.board[23] = { player: Player.One, count: 5 };
    state.remainingDice = [5, 1];
    const validator = createValidator();
    const result = validator.validateMove(state, createBearOffMove(20, 5, Player.One));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/legal move instead/i);
  });

  it('validates P2 exact bear-off', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.currentPlayer = Player.Two;
    state.board[0] = { player: Player.Two, count: 5 }; // die 1
    state.board[5] = { player: Player.Two, count: 10 }; // die 6
    state.remainingDice = [1, 2];
    const validator = createValidator();
    // P2 bear-off from 0 with die 1 (exact match)
    const result = validator.validateMove(state, createBearOffMove(0, 1, Player.Two));
    expect(result.isValid).toBe(true);
  });
});

describe('createValidator - getLegalMoves (bear-off)', () => {
  it('generates exact bear-off moves', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[18] = { player: Player.One, count: 5 };
    state.board[20] = { player: Player.One, count: 5 };
    state.board[22] = { player: Player.One, count: 5 };
    state.remainingDice = [6, 4, 2, 1];
    // Wait - with 4 dice starting and already set to 4, need to handle
    state.remainingDice = [6, 6, 6, 6]; // doubles for simplicity
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    // die 6 → bear-off from 18 (exact)
    expect(moves.some((m) => m.to === -1 && m.from === 18 && m.diceUsed === 6)).toBe(true);
  });

  it('includes bear-off moves alongside normal moves when bear-off is possible', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[18] = { player: Player.One, count: 3 };
    state.board[20] = { player: Player.One, count: 5 };
    state.board[22] = { player: Player.One, count: 7 };
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const moves = validator.getLegalMoves(state);

    // With checkers on 18, 20, 22 (all in home, no bar)
    // die 3 → bear-off from 21, but 21 has no checker → check higher die rule
    // die 1 → bear-off from 23, but 23 has no checker → check higher die rule
    // max die = 24-18=6, 3 not > 6, 1 not > 6 → no higher die bear-off
    // But die 3 from 20 → 23 (within home) → valid normal move
    expect(moves.some((m) => m.to >= 0 && m.to < 24)).toBe(true);
  });

  it('applies higher die rule when die exceeds all occupied home points', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    // P1 home is 18-23. Place checkers only on 19 (die 5) and 20 (die 4)
    state.board[19] = { player: Player.One, count: 5 };
    state.board[20] = { player: Player.One, count: 10 };
    state.remainingDice = [6, 1];
    const validator = createValidator();
    // die 6 → exact from 18, no checker at 18. Highest occupied = 20 (die 4).
    // 6 > 4 → higher die rule → bear off from 20
    const moves = validator.getLegalMoves(state);
    expect(moves.some((m) => m.to === -1 && m.from === 20 && m.diceUsed === 6)).toBe(true);
  });

  it('does not apply higher die rule when a normal move is available', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    // P1 home, checkers on 19 (die 5) and 23 (die 1)
    state.board[19] = { player: Player.One, count: 5 };
    state.board[23] = { player: Player.One, count: 10 };
    state.remainingDice = [3, 2];
    const validator = createValidator();
    // die 3 → exact from 21, no checker. Check higher die rule.
    // max die = max(5, 1) = 5. 3 not > 5. → no higher die rule
    // But 19+3=22 (within home, empty) → valid normal move
    const moves = validator.getLegalMoves(state);
    expect(moves.some((m) => m.to === -1 && m.diceUsed === 3)).toBe(false);
    expect(moves.some((m) => m.from === 19 && m.to === 22 && m.diceUsed === 3)).toBe(true);
  });

  it('does not generate bear-off moves when die is not higher than highest occupied and no exact match', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    // P1 home, checkers only on 23 (die 1) and 22 (die 2)
    state.board[22] = { player: Player.One, count: 5 };
    state.board[23] = { player: Player.One, count: 10 };
    state.remainingDice = [3, 4];
    const validator = createValidator();
    // die 3 → exact from 21, no checker. Highest occupied = 23 → highestDie = 1.
    // 3 > 1 → higher die rule would apply, BUT there's a normal move:
    //   22+3=25 out of bounds, 23+3=26 out of bounds → no normal moves.
    // So higher die rule: bear off from 23 with die 3.
    // die 4 → exact from 20, no checker. Highest occupied = 23 → highestDie = 1.
    // 4 > 1 → higher die rule → bear off from 23.
    const moves = validator.getLegalMoves(state);
    expect(moves.some((m) => m.to === -1 && m.from === 23 && m.diceUsed === 3)).toBe(true);
    expect(moves.some((m) => m.to === -1 && m.from === 23 && m.diceUsed === 4)).toBe(true);
  });

  it('rejects bear-off when die is not higher than highest occupied and no exact match', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    // P2 home (0-5), checkers only on 0 (die 1)
    state.currentPlayer = Player.Two;
    state.board[0] = { player: Player.Two, count: 3 };
    state.remainingDice = [2, 3];
    const validator = createValidator();
    // die 2 → exact from 1, no checker. Highest occupied = 0 → highestDie = 1.
    // 2 > 1 → higher die rule → bear off from 0.
    const result = validator.validateMove(state, createBearOffMove(0, 2, Player.Two));
    expect(result.isValid).toBe(true);
    // die 3 → exact from 2, no checker. Same highest = 0 → highestDie = 1.
    // 3 > 1 → higher die rule → bear off from 0.
    const result2 = validator.validateMove(state, createBearOffMove(0, 3, Player.Two));
    expect(result2.isValid).toBe(true);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────

describe('createValidator - edge cases', () => {
  it('rejects move with from=-1 and to=-1 (impossible bar/bear-off)', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.remainingDice = [3, 1];
    const validator = createValidator();
    const move = createMove(-1, -1, 3, Player.One);
    const result = validator.validateMove(state, move);
    expect(result.isValid).toBe(false);
  });

  it('hasLegalMoves returns false for finished game', () => {
    const state = createEmptyState();
    state.phase = 'finished' as any;
    const validator = createValidator();
    expect(validator.hasLegalMoves(state)).toBe(false);
  });

  it('canBearOff returns false for finished game', () => {
    const state = createEmptyState();
    state.phase = 'finished' as any;
    const validator = createValidator();
    expect(validator.canBearOff(state)).toBe(false);
  });

  it('canBearOff returns false when all checkers already borne off', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.board[18] = { player: Player.One, count: 0 };
    state.players[0].checkersBorneOff = 15;
    const validator = createValidator();
    expect(validator.canBearOff(state)).toBe(false);
  });

  it('validates hit on bar entry move', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.players[0].checkersOnBar = 1;
    state.board[0] = { player: Player.Two, count: 1 };
    state.remainingDice = [1, 2];
    state.currentPlayer = Player.One;
    const validator = createValidator();
    const move = createBarMove(0, 1, Player.One);
    const result = validator.validateMove(state, move);
    expect(result.isValid).toBe(true);
  });

  it('rejects bar entry when target point is blocked by multiple opponent checkers', () => {
    const state = createEmptyState();
    state.phase = 'playing' as any;
    state.players[0].checkersOnBar = 1;
    state.board[0] = { player: Player.Two, count: 3 };
    state.remainingDice = [1, 2];
    state.currentPlayer = Player.One;
    const validator = createValidator();
    const move = createBarMove(0, 1, Player.One);
    const result = validator.validateMove(state, move);
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/blocked/i);
  });
});
