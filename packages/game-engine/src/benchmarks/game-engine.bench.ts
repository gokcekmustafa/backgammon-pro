import {
  createValidator,
  createInitialState,
  cloneState,
  setDiceRoll,
  applyMove,
  executeAITurn,
  rollSpecificDice,
  createMove,
  Player,
  GamePhase,
  TurnPhase,
  type GameState,
  type Board,
} from '../index';

function bench(label: string, fn: () => void, iterations: number = 10000): number {
  // warmup
  for (let i = 0; i < Math.min(100, iterations); i++) fn();
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  const opsPerSec = Math.round(iterations / (elapsed / 1000));
  console.log(
    `  ${label}: ${elapsed.toFixed(2)}ms for ${iterations} iterations = ${opsPerSec.toLocaleString()} ops/sec`,
  );
  return opsPerSec;
}

function createMidGameState(): GameState {
  const board: Board = [];
  for (let i = 0; i < 24; i++) board.push({ player: null, count: 0 });
  // Scattered checkers for both players
  board[1] = { player: Player.One, count: 2 };
  board[3] = { player: Player.Two, count: 3 };
  board[6] = { player: Player.One, count: 3 };
  board[8] = { player: Player.Two, count: 2 };
  board[12] = { player: Player.One, count: 2 };
  board[14] = { player: Player.Two, count: 3 };
  board[17] = { player: Player.One, count: 3 };
  board[19] = { player: Player.Two, count: 2 };
  board[21] = { player: Player.One, count: 2 };
  board[23] = { player: Player.Two, count: 2 };
  return {
    board,
    players: [
      { checkersOnBar: 2, checkersBorneOff: 0 },
      { checkersOnBar: 2, checkersBorneOff: 0 },
    ],
    currentPlayer: Player.One,
    diceRoll: null,
    remainingDice: [4, 3],
    doublingCube: { value: 1, owner: null },
    phase: GamePhase.Playing,
    turn: { number: 15, phase: TurnPhase.WaitingForMove },
    winner: null,
    winType: null,
  };
}

function createBearOffState(): GameState {
  const board: Board = [];
  for (let i = 0; i < 24; i++) board.push({ player: null, count: 0 });
  board[19] = { player: Player.One, count: 3 };
  board[20] = { player: Player.One, count: 3 };
  board[22] = { player: Player.One, count: 2 };
  board[23] = { player: Player.One, count: 2 };
  board[0] = { player: Player.Two, count: 5 };
  board[2] = { player: Player.Two, count: 2 };
  board[3] = { player: Player.Two, count: 3 };
  board[4] = { player: Player.Two, count: 3 };
  board[5] = { player: Player.Two, count: 2 };
  return {
    board,
    players: [
      { checkersOnBar: 0, checkersBorneOff: 5 },
      { checkersOnBar: 0, checkersBorneOff: 0 },
    ],
    currentPlayer: Player.One,
    diceRoll: null,
    remainingDice: [5, 3],
    doublingCube: { value: 1, owner: null },
    phase: GamePhase.Playing,
    turn: { number: 40, phase: TurnPhase.WaitingForMove },
    winner: null,
    winType: null,
  };
}

function createEndGameState(): GameState {
  const board: Board = [];
  for (let i = 0; i < 24; i++) board.push({ player: null, count: 0 });
  board[20] = { player: Player.One, count: 2 };
  board[0] = { player: Player.Two, count: 2 };
  return {
    board,
    players: [
      { checkersOnBar: 0, checkersBorneOff: 13 },
      { checkersOnBar: 0, checkersBorneOff: 13 },
    ],
    currentPlayer: Player.One,
    diceRoll: null,
    remainingDice: [6, 5],
    doublingCube: { value: 2, owner: Player.One },
    phase: GamePhase.Playing,
    turn: { number: 55, phase: TurnPhase.WaitingForMove },
    winner: null,
    winType: null,
  };
}

console.log('\n=== Game Engine Benchmarks ===');

const initial = createInitialState();
const midGame = createMidGameState();
const bearOff = createBearOffState();
const endGame = createEndGameState();
const validator = createValidator();

console.log('\n--- cloneState ---');
bench('clone initial state', () => cloneState(initial));
bench('clone mid-game state', () => cloneState(midGame));
bench('clone bear-off state', () => cloneState(bearOff));

console.log('\n--- createValidator ---');
bench('create validator', () => createValidator());

console.log('\n--- validateMove ---');
// Clone a valid move
const validMove = createMove(0, 5, 5, Player.One);
bench('validateMove (initial, valid)', () => validator.validateMove(initial, validMove));

console.log('\n--- getLegalMoves ---');
bench('getLegalMoves (initial, 5-3)', () => {
  const s = setDiceRoll(cloneState(initial), rollSpecificDice(5, 3));
  createValidator().getLegalMoves(s);
});
bench('getLegalMoves (mid-game, 4-3)', () => {
  const s = setDiceRoll(cloneState(midGame), rollSpecificDice(4, 3));
  createValidator().getLegalMoves(s);
});
bench('getLegalMoves (mid-game, doubles 3-3)', () => {
  const s = setDiceRoll(cloneState(midGame), rollSpecificDice(3, 3));
  createValidator().getLegalMoves(s);
});
bench('getLegalMoves (bear-off, 5-3)', () => {
  const s = setDiceRoll(cloneState(bearOff), rollSpecificDice(5, 3));
  createValidator().getLegalMoves(s);
});
bench('getLegalMoves (end-game, 6-5)', () => {
  const s = setDiceRoll(cloneState(endGame), rollSpecificDice(6, 5));
  createValidator().getLegalMoves(s);
});

console.log('\n--- applyMove ---');
bench('applyMove (initial, forward)', () => {
  const s = cloneState(initial);
  applyMove(s, validMove);
});

console.log('\n--- executeAITurn ---');
bench('executeAITurn (initial, random roll)', () => executeAITurn(initial));

console.log('\n--- Match simulation (benchmark) ---');
{
  let state = createInitialState();
  const n = 10000;
  const start = performance.now();
  for (let i = 0; i < n; i++) {
    state = executeAITurn(state);
    if (state.phase === GamePhase.Finished) {
      state = createInitialState();
    }
  }
  const elapsed = performance.now() - start;
  const ops = Math.round(n / (elapsed / 1000));
  console.log(
    `  AI turn simulation: ${elapsed.toFixed(2)}ms for ${n} turns = ${ops.toLocaleString()} turns/sec`,
  );
}
