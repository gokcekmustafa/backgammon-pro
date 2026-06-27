import type { GameState, Move, MoveValidation, MoveValidator } from './types';

export function createMoveValidation(
  move: Move,
  isValid: boolean,
  reason?: string,
): MoveValidation {
  return { move, isValid, reason };
}

export function validMove(move: Move): MoveValidation {
  return createMoveValidation(move, true);
}

export function invalidMove(move: Move, reason: string): MoveValidation {
  return createMoveValidation(move, false, reason);
}

export function createPermissiveValidator(): MoveValidator {
  return {
    validateMove(_state: GameState, move: Move): MoveValidation {
      return validMove(move);
    },

    getLegalMoves(_state: GameState): Move[] {
      return [];
    },

    canBearOff(_state: GameState): boolean {
      return false;
    },

    hasLegalMoves(_state: GameState): boolean {
      return false;
    },
  };
}

export function createStrictValidator(): MoveValidator {
  return {
    validateMove(_state: GameState, move: Move): MoveValidation {
      return invalidMove(move, 'Validator not implemented');
    },

    getLegalMoves(_state: GameState): Move[] {
      return [];
    },

    canBearOff(_state: GameState): boolean {
      return false;
    },

    hasLegalMoves(_state: GameState): boolean {
      return false;
    },
  };
}

export function createValidator(): MoveValidator {
  return createStrictValidator();
}
