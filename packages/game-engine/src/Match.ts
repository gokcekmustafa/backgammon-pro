import type {
  MatchConfig,
  MatchState,
  MatchPlayerInfo,
  GameRecord,
  Player,
  WinType,
} from './types';
import { MatchStatus, Player as P } from './types';

export function createMatchPlayerInfo(playerId: string | null): MatchPlayerInfo {
  return { playerId, score: 0 };
}

export function createMatchConfig(totalGames: number, isRanked: boolean = true): MatchConfig {
  return { totalGames, isRanked };
}

export function createMatch(config: MatchConfig): MatchState {
  return {
    player1: createMatchPlayerInfo(null),
    player2: createMatchPlayerInfo(null),
    games: [],
    currentGameIndex: 0,
    status: MatchStatus.Pending,
    config,
    winner: null,
  };
}

export function setMatchPlayers(
  match: MatchState,
  player1Id: string | null,
  player2Id: string | null,
): MatchState {
  return {
    ...match,
    player1: { ...match.player1, playerId: player1Id },
    player2: { ...match.player2, playerId: player2Id },
  };
}

export function startMatch(match: MatchState): MatchState {
  return {
    ...match,
    status: MatchStatus.InProgress,
    games: [],
    currentGameIndex: 0,
  };
}

export function createEmptyGameRecord(): GameRecord {
  return { winner: null, winType: null, winValue: 0 };
}

export function startNextGame(match: MatchState): MatchState {
  const games = [...match.games, createEmptyGameRecord()];

  return {
    ...match,
    games,
    currentGameIndex: games.length - 1,
  };
}

export function recordGameResult(
  match: MatchState,
  winner: Player,
  winType: WinType,
  winValue: number,
): MatchState {
  const games = [...match.games];
  const currentGame: GameRecord = {
    winner,
    winType,
    winValue,
  };

  if (games.length === 0) {
    games.push(currentGame);
  } else {
    games[match.currentGameIndex] = currentGame;
  }

  const player1Score = match.player1.score + (winner === P.One ? 1 : 0);
  const player2Score = match.player2.score + (winner === P.Two ? 1 : 0);

  const scoreLimit = Math.ceil(match.config.totalGames / 2);

  const isOver = player1Score >= scoreLimit || player2Score >= scoreLimit;
  const matchWinner = isOver ? winner : null;

  return {
    ...match,
    games,
    player1: { ...match.player1, score: player1Score },
    player2: { ...match.player2, score: player2Score },
    status: isOver ? MatchStatus.Completed : match.status,
    winner: matchWinner,
  };
}

export function isMatchOver(match: MatchState): boolean {
  return match.status === MatchStatus.Completed || match.status === MatchStatus.Abandoned;
}

export function getMatchWinner(match: MatchState): Player | null {
  return match.winner;
}

export function getMatchScore(match: MatchState): [number, number] {
  return [match.player1.score, match.player2.score];
}

export function getRequiredWins(config: MatchConfig): number {
  return Math.ceil(config.totalGames / 2);
}

export function getGamesRemaining(match: MatchState): number {
  const required = getRequiredWins(match.config);
  const p1Wins = match.player1.score;
  const p2Wins = match.player2.score;
  const maxWins = Math.max(p1Wins, p2Wins);
  return Math.max(0, required - maxWins);
}
