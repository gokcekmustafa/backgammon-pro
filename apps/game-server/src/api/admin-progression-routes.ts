import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const achievementSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  icon: z.string().optional(),
  category: z.enum(['GAMEPLAY', 'COMPETITIVE', 'SOCIAL', 'TOURNAMENT', 'PREMIUM', 'SPECIAL', 'SEASONAL']),
  xpReward: z.number().int().min(0).optional(),
  badge: z.string().optional(),
  hidden: z.boolean().optional(),
  requirementType: z.string().min(1),
  requirementValue: z.number().int().min(1),
  sortOrder: z.number().int().optional(),
});

const missionSchema = z.object({
  key: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  xpReward: z.number().int().min(0),
  requirementType: z.string().min(1),
  requirementValue: z.number().int().min(1),
  period: z.enum(['DAILY', 'WEEKLY']),
});

async function recordAudit(prisma: PrismaClient, actorId: string, action: string, targetId: string | undefined, ip?: string, metadata?: Record<string, unknown>) {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
  await prisma.auditLog.create({
    data: {
      actorId, actorRole: (actor?.role ?? 'SUPER_ADMIN') as any,
      targetId, action, ip, metadata: (metadata ?? {}) as any,
    },
  });
}

export function registerAdminProgressionRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  app.post('/api/admin/achievements', { preHandler: [...authAndRole, validateBody(achievementSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const body = request.body as z.infer<typeof achievementSchema>;
    const ach = await prisma.achievement.create({ data: body as any });
    await recordAudit(prisma, request.user!.id, 'CREATE_ACHIEVEMENT', ach.id, request.ip);
    return reply.status(201).send(ach);
  });

  app.put('/api/admin/achievements/:id', { preHandler: [...authAndRole, validateBody(achievementSchema.partial())] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<z.infer<typeof achievementSchema>>;
    const ach = await prisma.achievement.update({ where: { id }, data: body as any });
    await recordAudit(prisma, request.user!.id, 'EDIT_ACHIEVEMENT', id, request.ip);
    return reply.send(ach);
  });

  app.delete('/api/admin/achievements/:id', { preHandler: authAndRole }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await prisma.achievement.delete({ where: { id } });
    await recordAudit(prisma, request.user!.id, 'DELETE_ACHIEVEMENT', id, request.ip);
    return reply.send({ success: true });
  });

  app.post('/api/admin/missions', { preHandler: [...authAndRole, validateBody(missionSchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const body = request.body as z.infer<typeof missionSchema>;
    const mission = await prisma.dailyMission.create({ data: body as any });
    await recordAudit(prisma, request.user!.id, 'CREATE_MISSION', mission.id, request.ip);
    return reply.status(201).send(mission);
  });

  app.put('/api/admin/missions/:id', { preHandler: [...authAndRole, validateBody(missionSchema.partial())] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<z.infer<typeof missionSchema>>;
    const mission = await prisma.dailyMission.update({ where: { id }, data: body as any });
    await recordAudit(prisma, request.user!.id, 'EDIT_MISSION', id, request.ip);
    return reply.send(mission);
  });

  app.delete('/api/admin/missions/:id', { preHandler: authAndRole }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await prisma.dailyMission.delete({ where: { id } });
    await recordAudit(prisma, request.user!.id, 'DELETE_MISSION', id, request.ip);
    return reply.send({ success: true });
  });

  // Grant XP (for testing/admin)
  app.post('/api/admin/xp/grant', { preHandler: authAndRole }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { userId, amount } = request.body as { userId: string; amount: number };
    const xpService = (await import('../xp-service')).XpService;
    const connections = (await import('../../src/connection-manager')).ConnectionManager;
    return reply.send({ error: 'Use service directly' });
  });
}