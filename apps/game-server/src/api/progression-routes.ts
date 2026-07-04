import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { XpService } from '../xp-service';
import type { AchievementService } from '../achievement-service';
import type { MissionService } from '../mission-service';
import { authMiddleware } from '../auth/middleware';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateBody, validateParams, validateQuery } from './validate';
import { z } from 'zod';

const missionIdParamsSchema = z.object({ missionId: z.string().min(1) });

export function registerProgressionRoutes(
  app: FastifyInstance,
  _prisma: PrismaClient,
  xp: XpService,
  achievements: AchievementService,
  missions: MissionService,
): void {
  const auth = [authMiddleware];

  // XP
  app.get('/api/progression/xp', { preHandler: auth }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const progress = await xp.getProgress(request.user!.id);
    return reply.send(progress);
  });

  app.get('/api/progression/xp/history', { preHandler: auth }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const query = request.query as { limit?: string };
    const history = await xp.getXpHistory(request.user!.id, query.limit ? parseInt(query.limit) : 20);
    return reply.send({ history });
  });

  // Achievements
  app.get('/api/progression/achievements', { preHandler: auth }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const groups = await achievements.getByCategory(request.user!.id);
    return reply.send({ groups });
  });

  app.get('/api/progression/achievements/unlocked-count', { preHandler: auth }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const count = await achievements.getUnlockedCount(request.user!.id);
    return reply.send({ count });
  });

  // Missions
  app.get('/api/progression/missions/daily', { preHandler: auth }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const daily = await missions.getDailyMissions(request.user!.id);
    return reply.send({ missions: daily });
  });

  app.get('/api/progression/missions/weekly', { preHandler: auth }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const weekly = await missions.getWeeklyMissions(request.user!.id);
    return reply.send({ missions: weekly });
  });

  app.post('/api/progression/missions/:missionId/claim', { preHandler: [...auth, validateParams(missionIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { missionId } = request.params as { missionId: string };
    try {
      const result = await missions.claimReward(request.user!.id, missionId);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}