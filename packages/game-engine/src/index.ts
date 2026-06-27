export {
  Player,
  GamePhase,
  TurnPhase,
  WinType,
  MatchStatus,
  opponent,
  isPlayerIndex,
  playerToIndex,
  indexToPlayer,
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
  GameResult,
} from './types';

export {
  createEmptyBoard,
  createEmptyState,
  cloneState,
  setCurrentPlayer,
  setDiceRoll,
  setRemainingDice,
  advanceTurn,
  completeGame,
  cancelGame,
  countCheckersOnBoard,
  isAllCheckersInHomeBoard,
  TOTAL_POINTS,
  TOTAL_CHECKERS_PER_PLAYER,
  INITIAL_DOUBLING_CUBE_VALUE,
} from './GameState';

export {
  rollDice,
  rollDiceSeeded,
  rollSpecificDice,
  getDiceValues,
  getUniqueDiceValues,
  removeDie,
  isDiceRoll,
  createDiceRoll,
  DICE_MIN,
  DICE_MAX,
  DICE_COUNT,
  DOUBLES_MULTIPLIER,
  DOUBLES_DIE_COUNT,
} from './Dice';

export {
  createMove,
  isBarMove,
  isBearOffMove,
  moveUsesDie,
  createBarMove,
  createBearOffMove,
  applyMove,
  undoMove,
  BAR_INDEX,
  BEAR_OFF_INDEX,
} from './Move';

export {
  createMoveValidation,
  validMove,
  invalidMove,
  createPermissiveValidator,
  createStrictValidator,
  createValidator,
} from './Validator';

export {
  createMatch,
  createMatchConfig,
  setMatchPlayers,
  startMatch,
  startNextGame,
  recordGameResult,
  isMatchOver,
  getMatchWinner,
  getMatchScore,
  getRequiredWins,
  getGamesRemaining,
} from './Match';
