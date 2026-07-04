import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { SeasonService } from '../season-service';
import { authMiddleware } from '../auth/middleware';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateBody, validateParams } from './validate';
import { z } from 'zod';

const seasonIdParamsSchema = z.object({ seasonId: z.string().min(1) });
const rewardIdParamsSchema = z.object({ rewardId: z.string().min(1) });

export function registerSeasonRoutes(
  app: FastifyInstance,
  _prisma: PrismaClient,
  seasons: SeasonService,
): void {
  const auth = [authMiddleware];

  app.get('/api/seasons/active', { preHandler: auth }, async (_request: AuthenticatedRequest, reply: FastifyReply) => {
    const season = await seasons.getActiveSeason();
    if (!season) return reply.status(404).send({ error: 'No active season' });
    return reply.send(season);
  });

  app.get('/api/seasons', { preHandler: auth }, async (_request: AuthenticatedRequest, reply: FastifyReply) => {
    const all = await seasons.listSeasons();
    return reply.send({ seasons: all });
  });

  app.get('/api/seasons/:seasonId', { preHandler: [...auth, validateParams(seasonIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { seasonId } = request.params as { seasonId: string };
    const season = await seasons.getSeasonById(seasonId);
    if (!season) return reply.status(404).send({ error: 'Season not found' });
    return reply.send(season);
  });

  app.get('/api/seasons/:seasonId/user', { preHandler: [...auth, validateParams(seasonIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { seasonId } = request.params as { seasonId: string };
    const userSeason = await seasons.getUserSeason(request.user!.id, seasonId);
    return reply.send(userSeason);
  });

  app.get('/api/seasons/:seasonId/levels', { preHandler: [...auth, validateParams(seasonIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { seasonId } = request.params as { seasonId: string };
    const bps = (await seasons.getSeasonById(seasonId))?.battlePasses ?? [];
    const allLevels: Record<string, any[]> = {};
    for (const bp of bps) {
      allLevels[bp.track] = await seasons.getLevels(bp.id);
    }
    return reply.send({ levels: allLevels });
  });

  app.get('/api/seasons/:seasonId/rewards', { preHandler: [...auth, validateParams(seasonIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { seasonId } = request.params as { seasonId: string };
    const rewards = await seasons.getRewards(request.user!.id, seasonId);
    return reply.send({ rewards });
  });

  app.post('/api/seasons/rewards/:rewardId/claim', { preHandler: [...auth, validateParams(rewardIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { rewardId } = request.params as { rewardId: string };
    try {
      const reward = await seasons.claimReward(request.user!.id, rewardId);
      return reply.send(reward);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}