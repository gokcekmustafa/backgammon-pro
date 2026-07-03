import type { Board, GameState, PlayerGameState, DiceRoll, Player } from './types';
import { GamePhase, TurnPhase, WinType, Player as P, playerToIndex, opponent } from './types';
import { getDiceValues } from './Dice';

export const TOTAL_POINTS = 24;
export const TOTAL_CHECKERS_PER_PLAYER = 15;
export const INITIAL_DOUBLING_CUBE_VALUE = 1;
export const NORMAL_WIN_VALUE = 1;
export const GAMMON_WIN_VALUE = 2;
export const BACKGAMMON_WIN_VALUE = 3;

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

export function createInitialBoard(): Board {
  const board = createEmptyBoard();
  // Player 1: 2 on point 0 (standard 24), 5 on point 11 (standard 13),
  //           3 on point 16 (standard 8), 5 on point 18 (standard 6)
  board[0] = { player: P.One, count: 2 };
  board[11] = { player: P.One, count: 5 };
  board[16] = { player: P.One, count: 3 };
  board[18] = { player: P.One, count: 5 };
  // Player 2: 2 on point 23 (standard 1), 5 on point 12 (standard 12),
  //           3 on point 17 (standard 7), 5 on point 5 (standard 19)
  board[23] = { player: P.Two, count: 2 };
  board[12] = { player: P.Two, count: 5 };
  board[17] = { player: P.Two, count: 3 };
  board[5] = { player: P.Two, count: 5 };
  return board;
}

export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    players: [createEmptyPlayerState(), createEmptyPlayerState()],
    currentPlayer: P.One,
    diceRoll: null,
    remainingDice: [],
    doublingCube: { value: INITIAL_DOUBLING_CUBE_VALUE, owner: null },
    phase: GamePhase.Playing,
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
  next.remainingDice = getDiceValues(roll);
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
  _winValue: number,
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

export function detectGameEnd(state: GameState): Player | null {
  if (state.players[0].checkersBorneOff >= TOTAL_CHECKERS_PER_PLAYER) return P.One;
  if (state.players[1].checkersBorneOff >= TOTAL_CHECKERS_PER_PLAYER) return P.Two;
  return null;
}

export function detectWinType(state: GameState, winner: Player): WinType {
  const loser = opponent(winner);
  const loserIdx = playerToIndex(loser);

  if (state.players[loserIdx].checkersBorneOff > 0) {
    return WinType.Normal;
  }

  const winnerHomeStart = winner === P.One ? 18 : 0;
  const winnerHomeEnd = winner === P.One ? 23 : 5;

  if (state.players[loserIdx].checkersOnBar > 0) {
    return WinType.Backgammon;
  }

  for (let i = winnerHomeStart; i <= winnerHomeEnd; i++) {
    if (state.board[i].player === loser) {
      return WinType.Backgammon;
    }
  }

  return WinType.Gammon;
}

export function calculateWinValue(winType: WinType): number {
  if (winType === WinType.Backgammon) return BACKGAMMON_WIN_VALUE;
  if (winType === WinType.Gammon) return GAMMON_WIN_VALUE;
  return NORMAL_WIN_VALUE;
}

export function resignGame(state: GameState, player: Player): GameState {
  const next = cloneState(state);
  next.phase = GamePhase.Finished;
  next.winner = opponent(player);
  next.winType = WinType.Resignation;
  return next;
}
