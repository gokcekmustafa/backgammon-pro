import type { GameState, Move, MoveValidation, MoveValidator, Board, Player } from './types';
import { playerToIndex } from './types';
import { BAR_INDEX, BEAR_OFF_INDEX, applyMove, isBearOffMove } from './Move';
import { isAllCheckersInHomeBoard, TOTAL_CHECKERS_PER_PLAYER } from './GameState';

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

function calculateTarget(from: number, dieValue: number, player: Player): number {
  if (from === BAR_INDEX) {
    return player === 1 ? dieValue - 1 : 24 - dieValue;
  }
  return player === 1 ? from + dieValue : from - dieValue;
}

function isValidPointTarget(target: number, player: Player, board: Board): boolean {
  if (target < 0 || target >= 24) return false;
  const point = board[target];
  if (point.player !== null && point.player !== player && point.count >= 2) return false;
  return true;
}

function getPlayerCheckersOnBar(state: GameState, player: Player): number {
  return state.players[playerToIndex(player)].checkersOnBar;
}

function getUniqueSortedDice(remainingDice: number[]): number[] {
  return [...new Set(remainingDice)].sort((a, b) => b - a);
}

function isBlot(board: Board, index: number, attacker: Player): boolean {
  const point = board[index];
  return point.player !== null && point.player !== attacker && point.count === 1;
}

function getBearOffIndexForDie(player: Player, dieValue: number): number {
  return player === 1 ? 24 - dieValue : dieValue - 1;
}

function getHighestOccupiedHomePoint(board: Board, player: Player): number | null {
  if (player === 1) {
    for (let i = 23; i >= 18; i--) {
      if (board[i].player === player) return i;
    }
  } else {
    for (let i = 0; i <= 5; i++) {
      if (board[i].player === player) return i;
    }
  }
  return null;
}

function getBearOffMovesForDie(board: Board, player: Player, dieValue: number): Move[] {
  const moves: Move[] = [];
  const exactIdx = getBearOffIndexForDie(player, dieValue);

  if (board[exactIdx].player === player) {
    moves.push({ from: exactIdx, to: BEAR_OFF_INDEX, diceUsed: dieValue, player });
    return moves;
  }

  const highest = getHighestOccupiedHomePoint(board, player);
  if (highest === null) return moves;

  const highestDie = player === 1 ? 24 - highest : highest + 1;
  if (dieValue > highestDie) {
    moves.push({ from: highest, to: BEAR_OFF_INDEX, diceUsed: dieValue, player });
  }

  return moves;
}

function hasLegalNonBearOffMoves(state: GameState, player: Player, dieValue: number): boolean {
  const checkersOnBar = getPlayerCheckersOnBar(state, player);
  if (checkersOnBar > 0) return false;

  for (let i = 0; i < 24; i++) {
    if (state.board[i].player !== player) continue;
    const target = calculateTarget(i, dieValue, player);
    if (target >= 0 && target < 24 && isValidPointTarget(target, player, state.board)) {
      return true;
    }
  }
  return false;
}

function canPlayerBearOff(state: GameState, player: Player): boolean {
  const idx = playerToIndex(player);
  if (state.players[idx].checkersOnBar > 0) return false;
  if (state.players[idx].checkersBorneOff >= TOTAL_CHECKERS_PER_PLAYER) return false;
  return isAllCheckersInHomeBoard(state, player);
}

function getAllLegalMovesForDie(state: GameState, player: Player, dieValue: number): Move[] {
  const moves: Move[] = [];
  const checkersOnBar = getPlayerCheckersOnBar(state, player);

  if (checkersOnBar > 0) {
    const target = calculateTarget(BAR_INDEX, dieValue, player);
    if (isValidPointTarget(target, player, state.board)) {
      const wasHit = isBlot(state.board, target, player);
      moves.push({ from: BAR_INDEX, to: target, diceUsed: dieValue, player, wasHit });
    }
    return moves;
  }

  const canBearOff = canPlayerBearOff(state, player);
  if (canBearOff) {
    const hasNormalMoves = hasLegalNonBearOffMoves(state, player, dieValue);
    if (!hasNormalMoves) {
      const bearOffMoves = getBearOffMovesForDie(state.board, player, dieValue);
      moves.push(...bearOffMoves);
      if (bearOffMoves.length > 0) return moves;
    }
  }

  for (let i = 0; i < 24; i++) {
    const point = state.board[i];
    if (point.player !== player || point.count === 0) continue;

    const target = calculateTarget(i, dieValue, player);
    if (isValidPointTarget(target, player, state.board)) {
      const wasHit = isBlot(state.board, target, player);
      moves.push({ from: i, to: target, diceUsed: dieValue, player, wasHit });
    }
  }

  return moves;
}

function allMovesUsed(dice: number[], moves: Move[]): boolean {
  const remaining = [...dice];
  for (const move of moves) {
    const idx = remaining.indexOf(move.diceUsed);
    if (idx !== -1) remaining.splice(idx, 1);
  }
  return remaining.length === 0;
}

function findBestMoveSequence(state: GameState, player: Player, dice: number[]): Move[][] {
  if (dice.length === 0) return [[]];

  const bestSequences: Move[][] = [];
  const uniqueDice = getUniqueSortedDice(dice);

  for (const dieValue of uniqueDice) {
    const dieIndex = dice.indexOf(dieValue);
    const remainingDice = [...dice];
    remainingDice.splice(dieIndex, 1);

    const singleMoves = getAllLegalMovesForDie(state, player, dieValue);

    if (singleMoves.length === 0 && remainingDice.length > 0) {
      const subSequences = findBestMoveSequence(state, player, remainingDice);
      for (const seq of subSequences) {
        const movesLeft = [...remainingDice];
        for (const m of seq) {
          const idx = movesLeft.indexOf(m.diceUsed);
          if (idx !== -1) movesLeft.splice(idx, 1);
        }
        if (movesLeft.length === 0 || seq.length > 0) {
          bestSequences.push(seq);
        }
      }
      continue;
    }

    if (singleMoves.length === 0) {
      bestSequences.push([]);
      continue;
    }

    for (const move of singleMoves) {
      const nextState = applyMove(state, move);
      const subSequences = findBestMoveSequence(nextState, player, remainingDice);

      if (subSequences.length === 0) {
        bestSequences.push([move]);
      } else {
        for (const seq of subSequences) {
          const combinedDice = [move.diceUsed, ...seq.map((m) => m.diceUsed)];
          if (allMovesUsed(dice, [move, ...seq])) {
            bestSequences.push([move, ...seq]);
          } else {
            const unusedDice = dice.filter(
              (d) =>
                !combinedDice.includes(d) ||
                combinedDice.filter((cd) => cd === d).length <
                  dice.filter((rd) => rd === d).length -
                    combinedDice.filter((cd) => cd === d).length,
            );
            if (unusedDice.length === 0 || seq.length > 0) {
              bestSequences.push([move, ...seq]);
            }
          }
        }
      }
    }
  }

  const maxLen = Math.max(...bestSequences.map((s) => s.length), 0);
  return bestSequences.filter((s) => s.length === maxLen);
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
  return {
    validateMove(state: GameState, move: Move): MoveValidation {
      if (state.phase !== 'playing' && state.phase !== 'not_started') {
        return invalidMove(move, 'Game is not in progress');
      }
      if (move.player !== state.currentPlayer) {
        return invalidMove(move, 'Not your turn');
      }
      if (move.diceUsed < 1 || move.diceUsed > 6) {
        return invalidMove(move, 'Invalid die value');
      }
      if (!state.remainingDice.includes(move.diceUsed)) {
        return invalidMove(move, 'Die value not available');
      }

      const checkersOnBar = getPlayerCheckersOnBar(state, move.player);
      if (checkersOnBar > 0 && move.from !== BAR_INDEX) {
        return invalidMove(move, 'Must enter checker from bar first');
      }
      if (checkersOnBar === 0 && move.from === BAR_INDEX) {
        return invalidMove(move, 'No checkers on bar');
      }

      if (move.from !== BAR_INDEX && move.from !== BEAR_OFF_INDEX) {
        if (move.from < 0 || move.from >= 24) {
          return invalidMove(move, 'Invalid from position');
        }
        const fromPoint = state.board[move.from];
        if (fromPoint.player !== move.player || fromPoint.count < 1) {
          return invalidMove(move, 'No checker at from position');
        }
      }

      if (isBearOffMove(move)) {
        return validateBearOff(state, move);
      }

      if (move.to < 0 || move.to >= 24) {
        return invalidMove(move, 'Move out of bounds');
      }

      const target = calculateTarget(move.from, move.diceUsed, move.player);
      if (move.to !== target) {
        return invalidMove(move, 'Move distance does not match die value');
      }

      const targetPoint = state.board[move.to];
      if (
        targetPoint.player !== null &&
        targetPoint.player !== move.player &&
        targetPoint.count >= 2
      ) {
        return invalidMove(move, 'Target point is blocked');
      }

      return validMove(move);
    },

    getLegalMoves(state: GameState): Move[] {
      if (state.phase !== 'playing' && state.phase !== 'not_started') return [];
      if (state.remainingDice.length === 0) return [];

      const player = state.currentPlayer;
      const dice = [...state.remainingDice].sort((a, b) => b - a);
      const sequences = findBestMoveSequence(state, player, dice);
      const seen = new Set<string>();
      const allMoves: Move[] = [];

      for (const seq of sequences) {
        for (const move of seq) {
          const key = `${move.from}:${move.to}:${move.diceUsed}`;
          if (!seen.has(key)) {
            seen.add(key);
            allMoves.push(move);
          }
        }
      }

      return allMoves;
    },

    canBearOff(state: GameState): boolean {
      if (state.phase !== 'playing') return false;
      return canPlayerBearOff(state, state.currentPlayer);
    },

    hasLegalMoves(state: GameState): boolean {
      return this.getLegalMoves(state).length > 0;
    },
  };
}

function validateBearOff(state: GameState, move: Move): MoveValidation {
  if (move.from < 0 || move.from >= 24) {
    return invalidMove(move, 'Invalid from position for bear-off');
  }

  const fromPoint = state.board[move.from];
  if (fromPoint.player !== move.player || fromPoint.count < 1) {
    return invalidMove(move, 'No checker at from position for bear-off');
  }

  if (!canPlayerBearOff(state, move.player)) {
    return invalidMove(move, 'Cannot bear off: not all checkers in home board');
  }

  const exactIdx = getBearOffIndexForDie(move.player, move.diceUsed);
  if (move.from === exactIdx) {
    return validMove(move);
  }

  const highest = getHighestOccupiedHomePoint(state.board, move.player);
  if (highest === null) {
    return invalidMove(move, 'No checkers in home board to bear off');
  }

  if (hasLegalNonBearOffMoves(state, move.player, move.diceUsed)) {
    return invalidMove(move, 'Must make a legal move instead of bearing off with higher die');
  }

  const highestDie = move.player === 1 ? 24 - highest : highest + 1;
  if (move.diceUsed > highestDie && move.from === highest) {
    return validMove(move);
  }

  return invalidMove(move, 'Cannot bear off: die does not match any checker position');
}
