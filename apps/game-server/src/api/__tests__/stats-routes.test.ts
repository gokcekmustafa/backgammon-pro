import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@backgammon/database';
import {
  playerStatsHandler,
  leaderboardHandler,
  matchHistoryHandler,
  avatarUploadHandler,
} from '../stats-routes';

function createMockPrisma(overrides: Partial<PrismaClient> = {}): PrismaClient {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    guestUser: {
      findUnique: vi.fn(),
    },
    rating: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    matchParticipant: {
      findMany: vi.fn(),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('playerStatsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns player stats for an existing user with a rating', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      createdAt: new Date(),
    });
    vi.mocked(prisma.guestUser.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue({
      id: 'rating-1',
      playerType: 'user',
      playerId: 'user-1',
      ratingType: 'standard',
      rating: 1400,
      peakRating: 1450,
      gamesPlayed: 50,
      wins: 30,
      losses: 18,
      draws: 2,
      updatedAt: new Date('2025-01-01'),
      createdAt: new Date('2024-01-01'),
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      avatarUrl: 'https://example.com/avatar.png',
      bio: 'Hello',
      location: 'US',
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.matchParticipant.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rating.count).mockResolvedValue(5);

    const result = await playerStatsHandler(prisma, { id: 'user-1' });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      id: 'user-1',
      username: 'testuser',
      type: 'user',
      rating: 1400,
      peakRating: 1450,
      gamesPlayed: 50,
      wins: 30,
      losses: 18,
      draws: 2,
      winRate: 60,
      avatarUrl: 'https://example.com/avatar.png',
      country: 'US',
      currentStreak: 0,
      bestStreak: 0,
      leaderboardRank: 6,
    });
  });

  it('returns null leaderboardRank for user without rating', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-2',
      username: 'newbie',
      displayName: 'New Player',
      createdAt: new Date(),
    });
    vi.mocked(prisma.guestUser.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.matchParticipant.findMany).mockResolvedValue([]);

    const result = await playerStatsHandler(prisma, { id: 'user-2' });
    expect(result.body.leaderboardRank).toBeNull();
  });

  it('returns null leaderboardRank for guest', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.guestUser.findUnique).mockResolvedValue({
      id: 'guest-1',
      displayName: 'Guest Player',
      createdAt: new Date(),
    });
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);

    const result = await playerStatsHandler(prisma, { id: 'guest-1' });
    expect(result.body.leaderboardRank).toBeNull();
  });

  it('returns 404 for non-existent player', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.guestUser.findUnique).mockResolvedValue(null);

    const result = await playerStatsHandler(prisma, { id: 'nonexistent' });
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: 'Player not found' });
  });

  it('computes streaks from recent matches', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      username: 'streaky',
      displayName: 'Streaky',
      createdAt: new Date(),
    });
    vi.mocked(prisma.guestUser.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.matchParticipant.findMany).mockResolvedValue([
      { isWinner: true, match: { status: 'completed', completedAt: new Date('2025-03-05') } },
      { isWinner: true, match: { status: 'completed', completedAt: new Date('2025-03-04') } },
      { isWinner: false, match: { status: 'completed', completedAt: new Date('2025-03-03') } },
      { isWinner: true, match: { status: 'completed', completedAt: new Date('2025-03-02') } },
      { isWinner: true, match: { status: 'completed', completedAt: new Date('2025-03-01') } },
    ] as any);

    const result = await playerStatsHandler(prisma, { id: 'u1' });
    expect(result.body.currentStreak).toBe(2);
    expect(result.body.bestStreak).toBe(2);
  });
});

describe('avatarUploadHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads avatar for the same user', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      avatarUrl: null,
      bio: null,
      location: null,
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await avatarUploadHandler(
      prisma,
      { id: 'u1' },
      { image: 'data:image/png;base64,iVBORw0KGgo=' },
      'u1',
    );
    expect(result.status).toBe(200);
    expect(result.body.avatarUrl).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(prisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        data: { avatarUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      }),
    );
  });

  it('creates profile when none exists', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

    const result = await avatarUploadHandler(
      prisma,
      { id: 'u1' },
      { image: 'data:image/jpeg;base64,/9j/4AAQ==' },
      'u1',
    );
    expect(result.status).toBe(200);
    expect(prisma.profile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: 'u1', avatarUrl: 'data:image/jpeg;base64,/9j/4AAQ==' },
      }),
    );
  });

  it('rejects when user id does not match', async () => {
    const prisma = createMockPrisma();
    const result = await avatarUploadHandler(
      prisma,
      { id: 'u1' },
      { image: 'data:image/png;base64,abc' },
      'u2',
    );
    expect(result.status).toBe(403);
  });

  it('rejects invalid image format', async () => {
    const prisma = createMockPrisma();
    const result = await avatarUploadHandler(
      prisma,
      { id: 'u1' },
      { image: 'data:image/bmp;base64,abc' },
      'u1',
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('Invalid image format');
  });

  it('rejects missing image', async () => {
    const prisma = createMockPrisma();
    const result = await avatarUploadHandler(prisma, { id: 'u1' }, { image: '' }, 'u1');
    expect(result.status).toBe(400);
  });
});

describe('leaderboardHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns top players sorted by rating descending', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      {
        id: 'r1',
        playerType: 'user',
        playerId: 'u1',
        ratingType: 'standard',
        rating: 1500,
        peakRating: 1500,
        gamesPlayed: 20,
        wins: 15,
        losses: 5,
        draws: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
      {
        id: 'r2',
        playerType: 'user',
        playerId: 'u2',
        ratingType: 'standard',
        rating: 1400,
        peakRating: 1400,
        gamesPlayed: 10,
        wins: 6,
        losses: 4,
        draws: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    vi.mocked(prisma.rating.count).mockResolvedValue(2);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: 'Alice' },
      { id: 'u2', username: 'bob', displayName: 'Bob' },
    ]);

    const result = await leaderboardHandler(prisma, {});
    expect(result.status).toBe(200);
    expect(result.body.total).toBe(2);
    expect(result.body.players).toHaveLength(2);
    expect(result.body.players[0].rank).toBe(1);
    expect(result.body.players[1].rank).toBe(2);
  });

  it('filters by search query', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: 'Alice' },
    ]);
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      {
        id: 'r1',
        playerType: 'user',
        playerId: 'u1',
        ratingType: 'standard',
        rating: 1500,
        peakRating: 1500,
        gamesPlayed: 20,
        wins: 15,
        losses: 5,
        draws: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    vi.mocked(prisma.rating.count).mockResolvedValue(1);

    const result = await leaderboardHandler(prisma, { search: 'alice' });
    expect(result.body.players).toHaveLength(1);
    expect(result.body.players[0].username).toBe('alice');
  });

  it('returns empty when search matches no users', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const result = await leaderboardHandler(prisma, { search: 'nonexistent' });
    expect(result.body.players).toHaveLength(0);
    expect(result.body.total).toBe(0);
  });
});

describe('matchHistoryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns match history for a user', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' });
    vi.mocked(prisma.guestUser.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.matchParticipant.findMany).mockResolvedValue([
      {
        isWinner: true,
        position: 1,
        match: {
          id: 'm1',
          status: 'completed',
          scorePlayer1: 3,
          scorePlayer2: 1,
          startedAt: new Date('2025-03-05T10:00:00Z'),
          completedAt: new Date('2025-03-05T11:30:00Z'),
          winnerPlayerId: 'u1',
          participants: [
            { playerType: 'user', playerId: 'u1', position: 1, isWinner: true },
            { playerType: 'user', playerId: 'u2', position: 2, isWinner: false },
          ],
        },
      },
    ] as any);

    const result = await matchHistoryHandler(prisma, { id: 'u1' }, { limit: '20' });
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(1);
    expect(result.body[0].result).toBe('win');
    expect(result.body[0].score).toBe('3 - 1');
    expect(result.body[0].duration).toBe(5400);
    expect(result.body[0].opponent).toMatchObject({ id: 'u2' });
  });

  it('returns 404 for non-existent player', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.guestUser.findUnique).mockResolvedValue(null);

    const result = await matchHistoryHandler(prisma, { id: 'nonexistent' }, {});
    expect(result.status).toBe(404);
  });

  it('handles draw matches', async () => {
    const prisma = createMockPrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' });
    vi.mocked(prisma.guestUser.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.matchParticipant.findMany).mockResolvedValue([
      {
        isWinner: false,
        position: 1,
        match: {
          id: 'm1',
          status: 'completed',
          scorePlayer1: 2,
          scorePlayer2: 2,
          startedAt: new Date('2025-03-05T10:00:00Z'),
          completedAt: new Date('2025-03-05T11:00:00Z'),
          winnerPlayerId: null,
          participants: [
            { playerType: 'user', playerId: 'u1', position: 1, isWinner: false },
            { playerType: 'user', playerId: 'u2', position: 2, isWinner: false },
          ],
        },
      },
    ] as any);

    const result = await matchHistoryHandler(prisma, { id: 'u1' }, {});
    expect(result.body[0].result).toBe('draw');
  });
});
