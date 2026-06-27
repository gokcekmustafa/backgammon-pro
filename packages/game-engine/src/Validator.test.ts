import { describe, it, expect } from 'vitest';
import {
  createMoveValidation,
  validMove,
  invalidMove,
  createPermissiveValidator,
  createStrictValidator,
  createValidator,
} from './Validator';
import { createEmptyState } from './GameState';
import { createMove } from './Move';
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
  it('returns a strict validator by default', () => {
    const validator = createValidator();
    const state = createEmptyState();
    const result = validator.validateMove(state, createMove(0, 1, 3, Player.One));
    expect(result.isValid).toBe(false);
  });
});
