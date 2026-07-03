import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import { validateParams, validateBody, validateQuery } from './validate';
import {
  playerStatsParamsSchema,
  avatarUploadBodySchema,
  leaderboardQuerySchema,
} from './validation';
import { authMiddleware } from '../auth/middleware';
import type { AuthenticatedRequest } from '../auth/middleware';

export async function playerStatsHandler(prisma: PrismaClient, params: { id: string }) {
  const { id } = params;

  const [user, guest, rating, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, displayName: true, createdAt: true },
    }),
    prisma.guestUser.findUnique({
      where: { id },
      select: { id: true, displayName: true, createdAt: true },
    }),
    prisma.rating.findUnique({
      where: {
        playerType_playerId_ratingType: {
          playerType: 'user',
          playerId: id,
          ratingType: 'standard',
        },
      },
    }),
    prisma.profile.findUnique({
      where: { userId: id },
      select: { avatarUrl: true, location: true },
    }),
  ]);

  if (!user && !guest) {
    return { status: 404 as const, body: { error: 'Player not found' } };
  }

  const displayName = user?.displayName ?? guest?.displayName ?? null;
  const playerType = user ? 'user' : 'guest';

  let currentStreak = 0;
  let bestStreak = 0;

  if (playerType === 'user') {
    const recentMatches = await prisma.matchParticipant.findMany({
      where: { playerType: 'user', playerId: id },
      select: {
        isWinner: true,
        match: {
          select: { status: true, completedAt: true },
        },
      },
      orderBy: { match: { completedAt: 'desc' } },
      take: 200,
    });

    const completed = recentMatches
      .filter((mp) => mp.match.status === 'completed' && mp.match.completedAt)
      .slice(0, 20);

    if (completed.length > 0) {
      const firstResult = completed[0].isWinner;
      currentStreak = 1;
      bestStreak = 1;
      let run = 1;

      for (let i = 1; i < completed.length; i++) {
        if (completed[i].isWinner === firstResult) {
          currentStreak++;
        } else {
          break;
        }
      }

      for (let i = 1; i < completed.length; i++) {
        if (completed[i].isWinner === completed[i - 1].isWinner) {
          run++;
        } else {
          run = 1;
        }
        if (run > bestStreak) bestStreak = run;
      }
    }
  }

  let leaderboardRank: number | null = null;
  if (playerType === 'user' && rating) {
    const higherRated = await prisma.rating.count({
      where: {
        playerType: 'user',
        ratingType: 'standard',
        rating: { gt: rating.rating },
      },
    });
    leaderboardRank = higherRated + 1;
  }

  return {
    status: 200 as const,
    body: {
      id: user?.id ?? guest!.id,
      username: user?.username ?? null,
      displayName,
      type: playerType,
      rating: rating?.rating ?? null,
      peakRating: rating?.peakRating ?? null,
      gamesPlayed: rating?.gamesPlayed ?? 0,
      wins: rating?.wins ?? 0,
      losses: rating?.losses ?? 0,
      draws: rating?.draws ?? 0,
      winRate:
        rating && rating.gamesPlayed > 0 ? Math.round((rating.wins / rating.gamesPlayed) * 100) : 0,
      lastGameAt: rating?.updatedAt.toISOString() ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      country: profile?.location ?? null,
      currentStreak,
      bestStreak,
      leaderboardRank,
    },
  };
}

export async function avatarUploadHandler(
  prisma: PrismaClient,
  params: { id: string },
  body: { image: string },
  userId: string,
) {
  if (params.id !== userId) {
    return { status: 403 as const, body: { error: 'Forbidden' } };
  }

  const image = body.image;
  if (!image || typeof image !== 'string') {
    return { status: 400 as const, body: { error: 'Image is required' } };
  }

  const validPrefixes = [
    'data:image/png;base64,',
    'data:image/jpeg;base64,',
    'data:image/webp;base64,',
    'data:image/gif;base64,',
  ];

  const isValid = validPrefixes.some((prefix) => image.startsWith(prefix));
  if (!isValid) {
    return {
      status: 400 as const,
      body: { error: 'Invalid image format. Supported: PNG, JPEG, WebP, GIF' },
    };
  }

  const maxSize = 2 * 1024 * 1024;
  const base64Data = image.split(',')[1] ?? '';
  const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
  if (sizeInBytes > maxSize) {
    return { status: 400 as const, body: { error: 'Image too large. Max 2MB' } };
  }

  const existingProfile = await prisma.profile.findUnique({ where: { userId: params.id } });

  if (existingProfile) {
    await prisma.profile.update({
      where: { userId: params.id },
      data: { avatarUrl: image },
    });
  } else {
    await prisma.profile.create({
      data: { userId: params.id, avatarUrl: image },
    });
  }

  return { status: 200 as const, body: { avatarUrl: image } };
}

export async function leaderboardHandler(
  prisma: PrismaClient,
  query: { offset?: string; limit?: string; search?: string },
) {
  const offset = Math.max(0, parseInt(query.offset ?? '0', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '100', 10)));
  const search = query.search?.trim() ?? '';

  const whereBase: Record<string, unknown> = { playerType: 'user', ratingType: 'standard' };

  let userIdsToFilter: string[] | undefined;
  if (search) {
    const matchedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      take: 100,
    });
    userIdsToFilter = matchedUsers.map((u) => u.id);
    if (userIdsToFilter.length === 0) {
      return {
        status: 200 as const,
        body: { players: [], total: 0, offset, limit },
      };
    }
  }

  const ratingWhere = userIdsToFilter
    ? { ...whereBase, playerId: { in: userIdsToFilter } }
    : whereBase;

  const [ratings, total] = await Promise.all([
    prisma.rating.findMany({
      where: ratingWhere as any,
      orderBy: { rating: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.rating.count({
      where: ratingWhere as any,
    }),
  ]);

  const userIds = ratings.map((r) => r.playerId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, displayName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const players = ratings
    .filter((r) => userMap.has(r.playerId))
    .map((r, idx) => {
      const u = userMap.get(r.playerId)!;
      return {
        id: r.playerId,
        username: u.username,
        displayName: u.displayName,
        rating: r.rating,
        peakRating: r.peakRating,
        gamesPlayed: r.gamesPlayed,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        winRate: r.gamesPlayed > 0 ? Math.round((r.wins / r.gamesPlayed) * 100) : 0,
        lastGameAt: r.updatedAt.toISOString(),
        rank: offset + idx + 1,
      };
    });

  return {
    status: 200 as const,
    body: { players, total, offset, limit },
  };
}

export async function matchHistoryHandler(
  prisma: PrismaClient,
  params: { id: string },
  query: { limit?: string },
) {
  const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20', 10)));

  const [user, guest] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.id }, select: { id: true } }),
    prisma.guestUser.findUnique({ where: { id: params.id }, select: { id: true } }),
  ]);

  if (!user && !guest) {
    return { status: 404 as const, body: { error: 'Player not found' } };
  }

  const playerType = user ? 'user' : 'guest';

  const matchParticipants = await prisma.matchParticipant.findMany({
    where: { playerType, playerId: params.id },
    select: {
      isWinner: true,
      position: true,
      match: {
        select: {
          id: true,
          status: true,
          scorePlayer1: true,
          scorePlayer2: true,
          startedAt: true,
          completedAt: true,
          winnerPlayerId: true,
          participants: {
            select: {
              playerType: true,
              playerId: true,
              position: true,
              isWinner: true,
            },
          },
        },
      },
    },
    orderBy: { match: { completedAt: 'desc' } },
    take: limit,
  });

  const matches = matchParticipants
    .filter((mp) => mp.match.status === 'completed' && mp.match.completedAt)
    .slice(0, limit)
    .map((mp) => {
      const match = mp.match;
      const opponent =
        match.participants.find((p) => p.playerId !== params.id || p.playerType !== playerType) ??
        match.participants.find((p) => p.position !== mp.position);
      const myScore = mp.position === 1 ? match.scorePlayer1 : match.scorePlayer2;
      const oppScore = mp.position === 1 ? match.scorePlayer2 : match.scorePlayer1;
      const isDraw = match.winnerPlayerId === null;
      const duration =
        match.startedAt && match.completedAt
          ? Math.round((match.completedAt.getTime() - match.startedAt.getTime()) / 1000)
          : null;

      return {
        id: match.id,
        result: isDraw ? 'draw' : mp.isWinner ? 'win' : 'loss',
        score: `${myScore} - ${oppScore}`,
        duration,
        completedAt: match.completedAt!.toISOString(),
        opponent: opponent
          ? {
              id: opponent.playerId,
              playerType: opponent.playerType,
            }
          : null,
      };
    });

  return {
    status: 200 as const,
    body: matches,
  };
}

export function registerStatsRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get(
    '/api/players/:id/stats',
    { preHandler: [validateParams(playerStatsParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { id: string };
      const result = await playerStatsHandler(prisma, params);
      return reply.status(result.status).send(result.body);
    },
  );

  app.get(
    '/api/players/:id/matches',
    { preHandler: [validateParams(playerStatsParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { id: string };
      const query = request.query as { limit?: string };
      const result = await matchHistoryHandler(prisma, params, query);
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/api/players/:id/avatar',
    {
      preHandler: [
        validateParams(playerStatsParamsSchema),
        validateBody(avatarUploadBodySchema),
        authMiddleware,
      ],
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const params = request.params as { id: string };
      const body = request.body as { image: string };
      const result = await avatarUploadHandler(prisma, params, body, request.user!.id);
      return reply.status(result.status).send(result.body);
    },
  );

  app.get(
    '/api/leaderboard',
    { preHandler: [validateQuery(leaderboardQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { offset?: string; limit?: string; search?: string };
      const result = await leaderboardHandler(prisma, query);
      return reply.status(result.status).send(result.body);
    },
  );
}
