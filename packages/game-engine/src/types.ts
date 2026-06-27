export enum Player {
  One = 1,
  Two = 2,
}

export enum GamePhase {
  NotStarted = 'not_started',
  Playing = 'playing',
  Finished = 'finished',
  Cancelled = 'cancelled',
}

export enum TurnPhase {
  WaitingForRoll = 'waiting_for_roll',
  WaitingForMove = 'waiting_for_move',
  Completed = 'completed',
}

export enum WinType {
  Normal = 'normal',
  Gammon = 'gammon',
  Backgammon = 'backgammon',
  Resignation = 'resignation',
  Timeout = 'timeout',
}

export enum MatchStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Abandoned = 'abandoned',
}

export interface PointState {
  player: Player | null;
  count: number;
}

export type Board = PointState[];

export interface DiceRoll {
  die1: number;
  die2: number;
  isDouble: boolean;
}

export interface DoublingCube {
  value: number;
  owner: Player | null;
}

export interface PlayerGameState {
  checkersOnBar: number;
  checkersBorneOff: number;
}

export interface TurnState {
  number: number;
  phase: TurnPhase;
}

export interface GameState {
  board: Board;
  players: [PlayerGameState, PlayerGameState];
  currentPlayer: Player;
  diceRoll: DiceRoll | null;
  remainingDice: number[];
  doublingCube: DoublingCube;
  phase: GamePhase;
  turn: TurnState;
  winner: Player | null;
  winType: WinType | null;
}

export interface Move {
  from: number;
  to: number;
  diceUsed: number;
  player: Player;
  wasHit?: boolean;
}

export interface MatchConfig {
  totalGames: number;
  isRanked: boolean;
}

export interface MatchPlayerInfo {
  playerId: string | null;
  score: number;
}

export interface GameRecord {
  winner: Player | null;
  winType: WinType | null;
  winValue: number;
}

export interface MatchState {
  player1: MatchPlayerInfo;
  player2: MatchPlayerInfo;
  games: GameRecord[];
  currentGameIndex: number;
  status: MatchStatus;
  config: MatchConfig;
  winner: Player | null;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface MoveValidation extends ValidationResult {
  move: Move;
}

export interface MoveValidator {
  validateMove(state: GameState, move: Move): MoveValidation;
  getLegalMoves(state: GameState): Move[];
  canBearOff(state: GameState): boolean;
  hasLegalMoves(state: GameState): boolean;
}

export interface GameResult {
  winner: Player | null;
  winType: WinType | null;
  winValue: number;
  isComplete: boolean;
}

export function opponent(player: Player): Player {
  return player === Player.One ? Player.Two : Player.One;
}

export function isPlayerIndex(value: number): value is 0 | 1 {
  return value === 0 || value === 1;
}

export function playerToIndex(player: Player): 0 | 1 {
  return player === Player.One ? 0 : 1;
}

export function indexToPlayer(index: number): Player {
  if (index === 0) return Player.One;
  if (index === 1) return Player.Two;
  throw new Error(`Invalid player index: ${index}`);
}
