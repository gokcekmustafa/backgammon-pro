import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  createInitialBoard,
  createValidator,
  setDiceRoll,
  applyMove,
  detectGameEnd,
  resignGame,
  rollDice,
  BAR_INDEX,
  BEAR_OFF_INDEX,
} from '@backgammon/game-engine';
import { Player, GamePhase, TurnPhase } from '@backgammon/game-engine';
import type { Move } from '@backgammon/game-engine';
import {
  createBoardGeometry,
  getCheckerPosition,
  computeCheckerDiameter,
} from '@backgammon/board-renderer';
import { findDropTarget } from './GameBoard';

const BOARD_WIDTH = 600;
const CHECKER_PADDING = 0.75;
const CHECKER_GAP = 2;

describe('Game Board Integration', () => {
  it('creates initial game state with correct board', () => {
    const state = createInitialState();
    expect(state.phase).toBe(GamePhase.Playing);
    expect(state.board.length).toBe(24);
    expect(state.players[0].checkersOnBar).toBe(0);
    expect(state.players[1].checkersOnBar).toBe(0);
  });

  it('initial board has correct checker distribution', () => {
    const board = createInitialBoard();
    let p1Count = 0;
    let p2Count = 0;
    for (const point of board) {
      if (point.player === Player.One) p1Count += point.count;
      if (point.player === Player.Two) p2Count += point.count;
    }
    expect(p1Count).toBe(15);
    expect(p2Count).toBe(15);
  });

  it('dice roll produces valid values', () => {
    const roll = rollDice();
    expect(roll.die1).toBeGreaterThanOrEqual(1);
    expect(roll.die1).toBeLessThanOrEqual(6);
    expect(roll.die2).toBeGreaterThanOrEqual(1);
    expect(roll.die2).toBeLessThanOrEqual(6);
    expect(roll.isDouble).toBe(roll.die1 === roll.die2);
  });

  it('setDiceRoll transitions to WaitingForMove', () => {
    const state = createInitialState();
    const next = setDiceRoll(state, { die1: 3, die2: 1, isDouble: false });
    expect(next.turn.phase).toBe(TurnPhase.WaitingForMove);
    expect(next.remainingDice).toEqual([3, 1]);
  });

  it('validator finds legal moves after roll', () => {
    const state = createInitialState();
    const rolled = setDiceRoll(state, { die1: 3, die2: 1, isDouble: false });
    const validator = createValidator();
    const moves = validator.getLegalMoves(rolled);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('applying a move updates board state', () => {
    const state = createInitialState();
    const rolled = setDiceRoll(state, { die1: 3, die2: 1, isDouble: false });
    const validator = createValidator();
    const moves = validator.getLegalMoves(rolled);
    const move = moves.find((m) => m.diceUsed === 3 && m.from === 0 && m.to === 3);
    expect(move).toBeDefined();
    if (move) {
      const next = applyMove(rolled, move);
      expect(next.board[0].count).toBe(1);
      expect(next.board[3].count).toBe(1);
      expect(next.remainingDice).toEqual([1]);
    }
  });

  it('detectGameEnd returns null during normal play', () => {
    const state = createInitialState();
    expect(detectGameEnd(state)).toBeNull();
  });

  it('detectGameEnd returns winner when all checkers borne off', () => {
    const state = createInitialState();
    state.players[0].checkersBorneOff = 15;
    expect(detectGameEnd(state)).toBe(Player.One);
  });

  it('resignGame properly ends game', () => {
    const state = createInitialState();
    const result = resignGame(state, Player.One);
    expect(result.phase).toBe(GamePhase.Finished);
    expect(result.winner).toBe(Player.Two);
    expect(result.winType).toBe('resignation');
  });
});

describe('Board Geometry', () => {
  it('createBoardGeometry returns 24 points', () => {
    const geo = createBoardGeometry(BOARD_WIDTH);
    expect(geo.points).toHaveLength(24);
  });

  it('getCheckerPosition returns valid circle', () => {
    const geo = createBoardGeometry(BOARD_WIDTH);
    const point = geo.points[0];
    const checkerDiam = computeCheckerDiameter(geo.pointWidth, CHECKER_PADDING);
    const pos = getCheckerPosition(point.rect, point.direction, 0, checkerDiam, CHECKER_GAP);
    expect(pos.cx).toBeGreaterThan(0);
    expect(pos.cy).toBeGreaterThan(0);
    expect(pos.radius).toBeGreaterThan(0);
  });

  it('computeCheckerDiameter is proportional to pointWidth', () => {
    const geo = createBoardGeometry(BOARD_WIDTH);
    const diam = computeCheckerDiameter(geo.pointWidth, CHECKER_PADDING);
    expect(diam).toBeLessThan(geo.pointWidth);
    expect(diam).toBeGreaterThan(0);
  });

  it('board has correct aspect ratio', () => {
    const geo = createBoardGeometry(BOARD_WIDTH);
    expect(geo.boardWidth).toBe(BOARD_WIDTH);
    expect(geo.boardHeight).toBeCloseTo(BOARD_WIDTH / 2.15, 0);
  });
});

describe('Full Game Flow', () => {
  it('can play a full turn (roll, move, switch player)', () => {
    const state = createInitialState();
    const rolled = setDiceRoll(state, { die1: 2, die2: 1, isDouble: false });
    const validator = createValidator();
    const moves = validator.getLegalMoves(rolled);

    const firstMove = moves.find((m) => m.from === 0 && m.to === 1);
    expect(firstMove).toBeDefined();

    if (firstMove) {
      let next = applyMove(rolled, firstMove);
      expect(next.remainingDice.length).toBe(1);

      const secondMoves = validator.getLegalMoves(next);
      const secondMove = secondMoves.find((m) => m.from === 0 && m.to === 2);
      if (secondMove) {
        next = applyMove(next, secondMove);
        expect(next.remainingDice.length).toBe(0);
        expect(next.currentPlayer).toBe(Player.Two);
      }
    }
  });

  it('handles double dice correctly', () => {
    const state = createInitialState();
    const rolled = setDiceRoll(state, { die1: 3, die2: 3, isDouble: true });
    expect(rolled.remainingDice).toEqual([3, 3, 3, 3]);
  });
});

describe('findDropTarget', () => {
  const BOARD_WIDTH = 600;
  const geo = createBoardGeometry(BOARD_WIDTH);
  const points = geo.points;
  const bw = geo.boardWidth;
  const bh = geo.boardHeight;

  function makeMove(from: number, to: number): Move {
    return { from, to, diceUsed: 3, player: Player.One, wasHit: false };
  }

  it('returns null when no legal moves from source', () => {
    const result = findDropTarget(100, 100, 0, [], points, bw, bh);
    expect(result).toBeNull();
  });

  it('returns correct destination when coordinates are within a valid point rect', () => {
    const legalMoves = [makeMove(0, 3), makeMove(0, 5)];
    const pt3 = points[3];
    const cx = pt3.rect.x + pt3.rect.width / 2;
    const cy = pt3.rect.y + pt3.rect.height / 2;
    const result = findDropTarget(cx, cy, 0, legalMoves, points, bw, bh);
    expect(result).toBe(3);
  });

  it('uses margin tolerance for near-miss coordinates', () => {
    const legalMoves = [makeMove(0, 3)];
    const pt3 = points[3];
    const nearX = pt3.rect.x + pt3.rect.width + 6;
    const nearY = pt3.rect.y + pt3.rect.height / 2;
    const result = findDropTarget(nearX, nearY, 0, legalMoves, points, bw, bh);
    expect(result).toBe(3);
  });

  it('returns null for coordinates far outside any valid rect', () => {
    const legalMoves = [makeMove(0, 3)];
    const result = findDropTarget(-100, -100, 0, legalMoves, points, bw, bh);
    expect(result).toBeNull();
  });

  it('returns BEAR_OFF_INDEX when outside board and bear-off is legal', () => {
    const bearOffMove: Move = {
      from: 0,
      to: BEAR_OFF_INDEX,
      diceUsed: 1,
      player: Player.One,
      wasHit: false,
    };
    const legalMoves = [bearOffMove];
    const result = findDropTarget(-20, -20, 0, legalMoves, points, bw, bh);
    expect(result).toBe(BEAR_OFF_INDEX);
  });

  it('returns null for outside board when bear-off is not legal', () => {
    const legalMoves = [makeMove(0, 3)];
    const result = findDropTarget(-20, -20, 0, legalMoves, points, bw, bh);
    expect(result).toBeNull();
  });

  it('returns BEAR_OFF_INDEX for out-of-bounds on any edge when bear-off allowed', () => {
    const bearOffMove: Move = {
      from: 0,
      to: BEAR_OFF_INDEX,
      diceUsed: 1,
      player: Player.One,
      wasHit: false,
    };
    const legalMoves = [bearOffMove];
    expect(findDropTarget(bw + 20, bh / 2, 0, legalMoves, points, bw, bh)).toBe(BEAR_OFF_INDEX);
    expect(findDropTarget(-20, bh / 2, 0, legalMoves, points, bw, bh)).toBe(BEAR_OFF_INDEX);
    expect(findDropTarget(bw / 2, -20, 0, legalMoves, points, bw, bh)).toBe(BEAR_OFF_INDEX);
    expect(findDropTarget(bw / 2, bh + 20, 0, legalMoves, points, bw, bh)).toBe(BEAR_OFF_INDEX);
  });

  it('returns closest destination among multiple legal targets', () => {
    const legalMoves = [makeMove(0, 3), makeMove(0, 5)];
    const pt3 = points[3];
    const pt5 = points[5];
    const midX = (pt3.rect.x + pt5.rect.x + pt5.rect.width) / 2;
    const midY = (pt3.rect.y + pt3.rect.height / 2 + pt5.rect.y + pt5.rect.height / 2) / 2;
    const result = findDropTarget(midX, midY, 0, legalMoves, points, bw, bh);
    expect([3, 5]).toContain(result);
  });

  it('ignores destinations outside 0-23 range (like bar index)', () => {
    const barMove: Move = {
      from: BAR_INDEX,
      to: 3,
      diceUsed: 2,
      player: Player.One,
      wasHit: false,
    };
    const normalMove = makeMove(5, 8);
    const legalMoves = [barMove, normalMove];
    const pt8 = points[8];
    const cx = pt8.rect.x + pt8.rect.width / 2;
    const cy = pt8.rect.y + pt8.rect.height / 2;
    const result = findDropTarget(cx, cy, 5, legalMoves, points, bw, bh);
    expect(result).toBe(8);
  });
});
