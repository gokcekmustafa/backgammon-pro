export {
  Player,
  GamePhase,
  TurnPhase,
  WinType,
  MatchStatus,
  opponent,
  playerToIndex,
} from './types';

export type {
  PointState,
  Board,
  DiceRoll,
  DoublingCube,
  PlayerGameState,
  TurnState,
  GameState,
  Move,
  MatchConfig,
  MatchPlayerInfo,
  GameRecord,
  MatchState,
  ValidationResult,
  MoveValidation,
  MoveValidator,
} from './types';

export {
  createEmptyBoard,
  createInitialBoard,
  createInitialState,
  cloneState,
  setDiceRoll,
  advanceTurn,
  completeGame,
  detectGameEnd,
  detectWinType,
  calculateWinValue,
  resignGame,
  TOTAL_CHECKERS_PER_PLAYER,
} from './GameState';

export { rollDice, DICE_MIN, DICE_MAX } from './Dice';

export { applyMove, undoMove, BAR_INDEX, BEAR_OFF_INDEX } from './Move';

export { createValidator } from './Validator';

export { executeAITurn } from './ai';

export { calculateElo } from './elo';
