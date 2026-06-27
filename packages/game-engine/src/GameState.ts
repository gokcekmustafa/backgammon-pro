import type { Board, GameState, PlayerGameState, DiceRoll, Player } from './types';
import { GamePhase, TurnPhase, Player as P, playerToIndex } from './types';

export const TOTAL_POINTS = 24;
export const TOTAL_CHECKERS_PER_PLAYER = 15;
export const INITIAL_DOUBLING_CUBE_VALUE = 1;

export function createEmptyBoard(): Board {
  const board: Board = [];
  for (let i = 0; i < TOTAL_POINTS; i++) {
    board.push({ player: null, count: 0 });
  }
  return board;
}

export function createEmptyPlayerState(): PlayerGameState {
  return { checkersOnBar: 0, checkersBorneOff: 0 };
}

export function createEmptyState(): GameState {
  return {
    board: createEmptyBoard(),
    players: [createEmptyPlayerState(), createEmptyPlayerState()],
    currentPlayer: P.One,
    diceRoll: null,
    remainingDice: [],
    doublingCube: { value: INITIAL_DOUBLING_CUBE_VALUE, owner: null },
    phase: GamePhase.NotStarted,
    turn: { number: 0, phase: TurnPhase.WaitingForRoll },
    winner: null,
    winType: null,
  };
}

export function cloneBoard(board: Board): Board {
  return board.map((point) => ({ ...point }));
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    players: [{ ...state.players[0] }, { ...state.players[1] }],
    diceRoll: state.diceRoll ? { ...state.diceRoll } : null,
    doublingCube: { ...state.doublingCube },
    turn: { ...state.turn },
  };
}

export function setCurrentPlayer(state: GameState, player: Player): GameState {
  const next = cloneState(state);
  next.currentPlayer = player;
  return next;
}

export function setDiceRoll(state: GameState, roll: DiceRoll): GameState {
  const next = cloneState(state);
  next.diceRoll = roll;

  if (roll.isDouble) {
    next.remainingDice = [roll.die1, roll.die1, roll.die1, roll.die1];
  } else {
    next.remainingDice = [roll.die1, roll.die2];
  }

  next.turn = { number: state.turn.number + 1, phase: TurnPhase.WaitingForMove };
  next.phase = GamePhase.Playing;

  return next;
}

export function setRemainingDice(state: GameState, dice: number[]): GameState {
  const next = cloneState(state);
  next.remainingDice = [...dice];
  return next;
}

export function advanceTurn(state: GameState): GameState {
  const next = cloneState(state);
  next.currentPlayer = state.currentPlayer === P.One ? P.Two : P.One;
  next.diceRoll = null;
  next.remainingDice = [];
  next.turn = { number: state.turn.number, phase: TurnPhase.WaitingForRoll };
  return next;
}

export function completeGame(
  state: GameState,
  winner: Player,
  winType: GameState['winType'],
  winValue: number,
): GameState {
  const next = cloneState(state);
  next.phase = GamePhase.Finished;
  next.winner = winner;
  next.winType = winType;
  return next;
}

export function cancelGame(state: GameState): GameState {
  const next = cloneState(state);
  next.phase = GamePhase.Cancelled;
  return next;
}

export function countCheckersOnBoard(state: GameState, player: Player): number {
  const idx = playerToIndex(player);
  let count = state.players[idx].checkersOnBar + state.players[idx].checkersBorneOff;

  for (const point of state.board) {
    if (point.player === player) {
      count += point.count;
    }
  }

  return count;
}

export function isAllCheckersInHomeBoard(state: GameState, player: Player): boolean {
  const idx = playerToIndex(player);

  if (state.players[idx].checkersOnBar > 0) {
    return false;
  }

  const homeStart = player === P.One ? 18 : 0;
  const homeEnd = player === P.One ? 23 : 5;

  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i].player === player) {
      if (i < homeStart || i > homeEnd) {
        return false;
      }
    }
  }

  return true;
}
