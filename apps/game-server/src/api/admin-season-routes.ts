import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient, BattlePassTrack } from '@backgammon/database';
import type { SeasonService } from '../season-service';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateBody, validateParams } from './validate';
import { z } from 'zod';

const seasonIdParamsSchema = z.object({ id: z.string().min(1) });
const levelIdParamsSchema = z.object({ levelId: z.string().min(1) });
const rewardIdParamsSchema = z.object({ rewardId: z.string().min(1) });

const createSeasonSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  seasonNumber: z.number().int().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  battlePasses: z.array(z.object({
    track: z.enum(['FREE', 'PREMIUM']),
    label: z.string().min(1).max(100),
    maxLevel: z.number().int().min(1).default(50),
    xpPerLevel: z.number().int().min(1).default(100),
    price: z.number().int().min(0).optional(),
  })).min(1),
});

const updateSeasonSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['UPCOMING', 'ACTIVE', 'ENDING_SOON', 'COMPLETED', 'ARCHIVED']).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().min(1).optional(),
});

const addRewardSchema = z.object({
  rewardType: z.enum(['XP', 'COINS', 'PREMIUM_DAYS', 'AVATAR_FRAME', 'PROFILE_BORDER', 'TITLE', 'EMOJI', 'DICE_SKIN', 'BOARD_THEME', 'TOURNAMENT_TICKET']),
  rewardValue: z.string().min(1).max(500),
});

async function recordAudit(prisma: PrismaClient, actorId: string, action: string, targetId?: string, ip?: string, metadata?: Record<string, unknown>) {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
  await prisma.auditLog.create({
    data: {
      actorId, actorRole: (actor?.role ?? 'SUPER_ADMIN') as any,
      targetId, action, ip, metadata: (metadata ?? {}) as any,
    },
  });
}

export function registerAdminSeasonRoutes(app: FastifyInstance, prisma: PrismaClient, seasons: SeasonService): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  app.get('/api/admin/seasons', { preHandler: authAndRole }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const all = await seasons.listSeasons();
    return reply.send({ seasons: all });
  });

  app.post('/api/admin/seasons', { preHandler: [...authAndRole, validateBody(createSeasonSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const body = request.body as z.infer<typeof createSeasonSchema>;
    const season = await seasons.createSeason(body);
    await recordAudit(prisma, request.user!.id, 'CREATE_SEASON', season.id, request.ip);
    return reply.status(201).send(season);
  });

  app.put('/api/admin/seasons/:id', { preHandler: [...authAndRole, validateParams(seasonIdParamsSchema), validateBody(updateSeasonSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateSeasonSchema>;
    const season = await seasons.updateSeason(id, body);
    await recordAudit(prisma, request.user!.id, 'EDIT_SEASON', id, request.ip);
    return reply.send(season);
  });

  app.post('/api/admin/seasons/:id/activate', { preHandler: [...authAndRole, validateParams(seasonIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await seasons.activateSeason(id);
    await recordAudit(prisma, request.user!.id, 'ACTIVATE_SEASON', id, request.ip);
    return reply.send({ success: true });
  });

  app.post('/api/admin/seasons/:id/close', { preHandler: [...authAndRole, validateParams(seasonIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await seasons.closeSeason(id);
    await recordAudit(prisma, request.user!.id, 'CLOSE_SEASON', id, request.ip);
    return reply.send({ success: true });
  });

  app.post('/api/admin/seasons/:id/archive', { preHandler: [...authAndRole, validateParams(seasonIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await seasons.archiveSeason(id);
    await recordAudit(prisma, request.user!.id, 'ARCHIVE_SEASON', id, request.ip);
    return reply.send({ success: true });
  });

  app.post('/api/admin/seasons/:userId/:seasonId/reset', { preHandler: authAndRole }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { userId, seasonId } = request.params as { userId: string; seasonId: string };
    await seasons.resetProgression(userId, seasonId);
    await recordAudit(prisma, request.user!.id, 'RESET_PROGRESSION', undefined, request.ip, { userId, seasonId });
    return reply.send({ success: true });
  });

  app.post('/api/admin/battle-pass/levels/:levelId/rewards', { preHandler: [...authAndRole, validateParams(levelIdParamsSchema), validateBody(addRewardSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { levelId } = request.params as { levelId: string };
    const body = request.body as z.infer<typeof addRewardSchema>;
    const reward = await seasons.addRewardToLevel(levelId, body.rewardType, body.rewardValue);
    await recordAudit(prisma, request.user!.id, 'ADD_REWARD', reward.id, request.ip);
    return reply.status(201).send(reward);
  });

  app.delete('/api/admin/rewards/:rewardId', { preHandler: [...authAndRole, validateParams(rewardIdParamsSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { rewardId } = request.params as { rewardId: string };
    await seasons.removeReward(rewardId);
    await recordAudit(prisma, request.user!.id, 'REMOVE_REWARD', rewardId, request.ip);
    return reply.send({ success: true });
  });
}