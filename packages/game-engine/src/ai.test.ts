import { describe, it, expect } from 'vitest';
import { getRandomAIMove, executeAITurn } from './ai';
import { createInitialState, setDiceRoll } from './GameState';
import { createValidator } from './Validator';
import { Player, GamePhase, TurnPhase } from './types';
import { TOTAL_CHECKERS_PER_PLAYER } from './GameState';
import { rollSpecificDice } from './Dice';

function alwaysFirstMove(): number {
  return 0;
}

describe('getRandomAIMove', () => {
  it('returns null for a finished game', () => {
    const state = createInitialState();
    state.phase = GamePhase.Finished;
    expect(getRandomAIMove(state)).toBeNull();
  });

  it('returns a legal move when moves exist', () => {
    const state = createInitialState();
    const rolled = setDiceRoll(state, { die1: 3, die2: 1, isDouble: false });
    const move = getRandomAIMove(rolled, alwaysFirstMove);
    const validator = createValidator();
    const allMoves = validator.getLegalMoves(rolled);
    expect(allMoves.length).toBeGreaterThan(0);
    expect(move).not.toBeNull();
    if (move) {
      const found = allMoves.some(
        (m) => m.from === move.from && m.to === move.to && m.diceUsed === move.diceUsed,
      );
      expect(found).toBe(true);
    }
  });
});

function dice(d1: number, d2: number) {
  return () => rollSpecificDice(d1, d2);
}

describe('executeAITurn', () => {
  it('completes a full turn and switches to opponent', () => {
    const state = createInitialState();
    const result = executeAITurn(state, dice(3, 1), alwaysFirstMove);
    expect(result.currentPlayer).toBe(Player.Two);
    expect(result.turn.phase).toBe(TurnPhase.WaitingForRoll);
    expect(result.remainingDice).toHaveLength(0);
  });

  it('does not mutate the original state', () => {
    const state = createInitialState();
    const boardBefore = state.board.map((p) => ({ ...p }));
    const pBefore = state.players.map((p) => ({ ...p }));

    executeAITurn(state, dice(3, 1), alwaysFirstMove);

    expect(state.board).toEqual(boardBefore);
    expect(state.players).toEqual(pBefore);
  });

  it('preserves total checker count (30)', () => {
    const state = createInitialState();
    const result = executeAITurn(state, dice(3, 1), alwaysFirstMove);
    const onBoard = result.board.reduce((sum, pt) => sum + pt.count, 0);
    const onBar = result.players[0].checkersOnBar + result.players[1].checkersOnBar;
    const borneOff = result.players[0].checkersBorneOff + result.players[1].checkersBorneOff;
    expect(onBoard + onBar + borneOff).toBe(TOTAL_CHECKERS_PER_PLAYER * 2);
  });

  it('produces valid state after multiple AI turns', () => {
    let state = createInitialState();
    for (let i = 0; i < 10; i++) {
      if (state.phase === GamePhase.Finished) break;
      state = executeAITurn(state, dice(3, 1), alwaysFirstMove);
    }
    expect(state.board).toHaveLength(24);
    expect([GamePhase.Playing, GamePhase.Finished]).toContain(state.phase);
    for (const pt of state.board) {
      expect(pt.count).toBeGreaterThanOrEqual(0);
    }
  });

  it('eventually finishes a game', () => {
    let state = createInitialState();
    let turns = 0;
    while (state.phase !== GamePhase.Finished && turns < 500) {
      state = executeAITurn(state);
      turns++;
    }
    expect(state.phase).toBe(GamePhase.Finished);
    expect(state.winner).not.toBeNull();
    expect(turns).toBeLessThan(500);
  });

  it('works when AI checkers are in home board (bearing off scenario)', () => {
    const state = createInitialState();
    for (let i = 0; i < 18; i++) {
      state.board[i] = { player: null, count: 0 };
    }
    state.board[18] = { player: Player.One, count: 3 };
    state.board[19] = { player: Player.One, count: 3 };
    state.board[20] = { player: Player.One, count: 3 };
    state.board[21] = { player: Player.One, count: 3 };
    state.board[22] = { player: Player.One, count: 2 };
    state.board[23] = { player: Player.One, count: 1 };
    state.players[0].checkersOnBar = 0;
    state.currentPlayer = Player.One;
    const result = executeAITurn(state, dice(3, 1), alwaysFirstMove);
    expect(result.currentPlayer).toBe(Player.Two);
    expect(result.turn.phase).toBe(TurnPhase.WaitingForRoll);
  });
});
