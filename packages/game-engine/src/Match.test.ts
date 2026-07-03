import { describe, it, expect } from 'vitest';
import {
  createMatch,
  createMatchConfig,
  setMatchPlayers,
  startMatch,
  startNextGame,
  recordGameResult,
  resignInMatch,
  isMatchOver,
  getMatchWinner,
  getMatchScore,
  getRequiredWins,
  getGamesRemaining,
} from './Match';
import { MatchStatus, Player, WinType } from './types';

describe('createMatchConfig', () => {
  it('creates config with given values', () => {
    const config = createMatchConfig(3, true);
    expect(config.totalGames).toBe(3);
    expect(config.isRanked).toBe(true);
  });

  it('defaults to ranked', () => {
    const config = createMatchConfig(5);
    expect(config.isRanked).toBe(true);
  });
});

describe('createMatch', () => {
  it('creates match with pending status', () => {
    const match = createMatch(createMatchConfig(3));
    expect(match.status).toBe(MatchStatus.Pending);
    expect(match.games).toEqual([]);
    expect(match.currentGameIndex).toBe(0);
    expect(match.winner).toBeNull();
  });

  it('initializes scores to zero', () => {
    const match = createMatch(createMatchConfig(1));
    expect(match.player1.score).toBe(0);
    expect(match.player2.score).toBe(0);
  });
});

describe('setMatchPlayers', () => {
  it('sets player ids', () => {
    const match = createMatch(createMatchConfig(1));
    const updated = setMatchPlayers(match, 'user-1', 'user-2');
    expect(updated.player1.playerId).toBe('user-1');
    expect(updated.player2.playerId).toBe('user-2');
  });

  it('does not mutate original match', () => {
    const match = createMatch(createMatchConfig(1));
    setMatchPlayers(match, 'user-1', 'user-2');
    expect(match.player1.playerId).toBeNull();
  });
});

describe('startMatch', () => {
  it('sets status to in progress', () => {
    const match = startMatch(createMatch(createMatchConfig(3)));
    expect(match.status).toBe(MatchStatus.InProgress);
  });
});

describe('startNextGame', () => {
  it('adds a game record', () => {
    const match = startMatch(createMatch(createMatchConfig(3)));
    const updated = startNextGame(match);
    expect(updated.games).toHaveLength(1);
    expect(updated.currentGameIndex).toBe(0);
  });

  it('creates empty game records for each call', () => {
    const match = startMatch(createMatch(createMatchConfig(3)));
    const g1 = startNextGame(match);
    const g2 = startNextGame(g1);
    expect(g2.games).toHaveLength(2);
  });
});

describe('recordGameResult', () => {
  it('records winner for current game', () => {
    const match = startMatch(createMatch(createMatchConfig(3)));
    const withGame = startNextGame(match);
    const result = recordGameResult(withGame, Player.One, WinType.Normal, 1);

    expect(result.games[0].winner).toBe(Player.One);
    expect(result.games[0].winType).toBe(WinType.Normal);
  });

  it('updates player scores', () => {
    const match = startMatch(createMatch(createMatchConfig(3)));
    const withGame = startNextGame(match);
    const result = recordGameResult(withGame, Player.One, WinType.Normal, 1);

    expect(result.player1.score).toBe(1);
    expect(result.player2.score).toBe(0);
  });

  it('completes match when player reaches score limit', () => {
    const match = startMatch(createMatch(createMatchConfig(1)));
    const withGame = startNextGame(match);
    const result = recordGameResult(withGame, Player.One, WinType.Normal, 1);

    expect(result.status).toBe(MatchStatus.Completed);
    expect(result.winner).toBe(Player.One);
  });

  it('does not complete match before score limit', () => {
    const match = startMatch(createMatch(createMatchConfig(3)));
    const withGame = startNextGame(match);
    const result = recordGameResult(withGame, Player.One, WinType.Normal, 1);

    expect(result.status).toBe(MatchStatus.InProgress);
    expect(result.winner).toBeNull();
  });

  it('handles multiple games correctly', () => {
    const match = startMatch(createMatch(createMatchConfig(5)));
    let m = match;

    m = startNextGame(m);
    m = recordGameResult(m, Player.One, WinType.Normal, 1);

    m = startNextGame(m);
    m = recordGameResult(m, Player.One, WinType.Normal, 1);

    m = startNextGame(m);
    m = recordGameResult(m, Player.Two, WinType.Normal, 1);

    m = startNextGame(m);
    m = recordGameResult(m, Player.One, WinType.Normal, 1);

    expect(m.status).toBe(MatchStatus.Completed);
    expect(m.winner).toBe(Player.One);
    expect(m.player1.score).toBe(3);
    expect(m.player2.score).toBe(1);
  });
});

describe('recordGameResult - gammon/backgammon scoring', () => {
  it('awards 2 points for a gammon win', () => {
    const match = startMatch(createMatch(createMatchConfig(5)));
    const withGame = startNextGame(match);
    const result = recordGameResult(withGame, Player.One, WinType.Gammon, 2);

    expect(result.player1.score).toBe(2);
    expect(result.player2.score).toBe(0);
    expect(result.games[0].winValue).toBe(2);
  });

  it('awards 3 points for a backgammon win', () => {
    const match = startMatch(createMatch(createMatchConfig(7)));
    const withGame = startNextGame(match);
    const result = recordGameResult(withGame, Player.One, WinType.Backgammon, 3);

    expect(result.player1.score).toBe(3);
    expect(result.games[0].winValue).toBe(3);
  });

  it('normal win awards 1 point', () => {
    const match = startMatch(createMatch(createMatchConfig(5)));
    const withGame = startNextGame(match);
    const result = recordGameResult(withGame, Player.Two, WinType.Normal, 1);

    expect(result.player2.score).toBe(1);
    expect(result.games[0].winValue).toBe(1);
  });

  it('gammon win can finish the match', () => {
    const match = startMatch(createMatch(createMatchConfig(3)));
    let m = startNextGame(match);
    m = recordGameResult(m, Player.One, WinType.Gammon, 2);

    expect(m.status).toBe(MatchStatus.Completed);
    expect(m.winner).toBe(Player.One);
  });
});

describe('resignInMatch', () => {
  it('records a resignation with winValue of 1', () => {
    const match = startMatch(createMatch(createMatchConfig(5)));
    const withGame = startNextGame(match);
    const result = resignInMatch(withGame, Player.One);

    expect(result.games[0].winner).toBe(Player.Two);
    expect(result.games[0].winType).toBe(WinType.Resignation);
    expect(result.games[0].winValue).toBe(1);
    expect(result.player2.score).toBe(1);
  });

  it('resigning player loses', () => {
    const match = startMatch(createMatch(createMatchConfig(5)));
    const withGame = startNextGame(match);
    const result = resignInMatch(withGame, Player.Two);

    expect(result.games[0].winner).toBe(Player.One);
    expect(result.player1.score).toBe(1);
  });
});

describe('isMatchOver', () => {
  it('returns true for completed match', () => {
    const match = { ...createMatch(createMatchConfig(1)), status: MatchStatus.Completed };
    expect(isMatchOver(match)).toBe(true);
  });

  it('returns false for in progress', () => {
    const match = { ...createMatch(createMatchConfig(3)), status: MatchStatus.InProgress };
    expect(isMatchOver(match)).toBe(false);
  });
});

describe('getMatchWinner', () => {
  it('returns null when no winner', () => {
    const match = createMatch(createMatchConfig(3));
    expect(getMatchWinner(match)).toBeNull();
  });

  it('returns winner when set', () => {
    const match = { ...createMatch(createMatchConfig(1)), winner: Player.One };
    expect(getMatchWinner(match)).toBe(Player.One);
  });
});

describe('getMatchScore', () => {
  it('returns current scores', () => {
    const match = {
      ...createMatch(createMatchConfig(3)),
      player1: { playerId: null, score: 2 },
      player2: { playerId: null, score: 1 },
    };
    const score = getMatchScore(match);
    expect(score).toEqual([2, 1]);
  });
});

describe('getRequiredWins', () => {
  it('returns 1 for best of 1', () => {
    expect(getRequiredWins(createMatchConfig(1))).toBe(1);
  });

  it('returns 2 for best of 3', () => {
    expect(getRequiredWins(createMatchConfig(3))).toBe(2);
  });

  it('returns 3 for best of 5', () => {
    expect(getRequiredWins(createMatchConfig(5))).toBe(3);
  });
});

describe('getGamesRemaining', () => {
  it('returns remaining games needed to win', () => {
    const match = {
      ...createMatch(createMatchConfig(5)),
      player1: { playerId: null, score: 2 },
      player2: { playerId: null, score: 0 },
    };
    expect(getGamesRemaining(match)).toBe(1);
  });

  it('returns 0 when match is won', () => {
    const match = {
      ...createMatch(createMatchConfig(3)),
      player1: { playerId: null, score: 2 },
      player2: { playerId: null, score: 0 },
    };
    expect(getGamesRemaining(match)).toBe(0);
  });
});
