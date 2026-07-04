import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { TournamentService } from '../tournament-service';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateBody, validateParams } from './validate';
import { z } from 'zod';

const tournamentIdParamsSchema = z.object({
  id: z.string().min(1),
});

const createBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  entryFee: z.number().min(0).optional(),
  prizePool: z.number().min(0).optional(),
  maxPlayers: z.number().int().min(2).max(256).optional(),
  minPlayers: z.number().int().min(2).optional(),
  startsAt: z.string().min(1),
  registrationEndsAt: z.string().optional(),
  prizes: z.array(z.object({
    position: z.number().int().min(1),
    label: z.string().optional(),
    amount: z.number().min(0),
    percentage: z.number().min(0).max(100).optional(),
  })).optional(),
});

async function recordAudit(
  prisma: PrismaClient,
  actorId: string,
  actorRole: string,
  targetId: string | undefined,
  action: string,
  ip: string | undefined,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole: actorRole as any,
      targetId,
      action,
      ip,
      metadata: metadata ?? {},
    },
  });
}

export function registerAdminTournamentRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  tournaments: TournamentService,
): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  app.post(
    '/api/admin/tournaments',
    { preHandler: [...authAndRole, validateBody(createBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof createBodySchema>;
      const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });

      const tournament = await prisma.tournament.create({
        data: {
          name: body.name,
          description: body.description,
          type: body.type,
          visibility: body.visibility ?? 'PUBLIC',
          entryFee: body.entryFee ?? 0,
          prizePool: body.prizePool ?? 0,
          maxPlayers: body.maxPlayers ?? 16,
          minPlayers: body.minPlayers ?? 2,
          startsAt: new Date(body.startsAt),
          registrationEndsAt: body.registrationEndsAt ? new Date(body.registrationEndsAt) : null,
          createdById: request.user!.id,
          prizes: body.prizes ? {
            createMany: { data: body.prizes.map((p) => ({
              position: p.position, label: p.label, amount: p.amount, percentage: p.percentage,
            })) },
          } : undefined,
        },
      });

      await recordAudit(prisma, request.user!.id, actor!.role, tournament.id, 'CREATE_TOURNAMENT', request.ip, { name: body.name, type: body.type });
      return reply.status(201).send(tournament);
    },
  );

  app.put(
    '/api/admin/tournaments/:id',
    { preHandler: [...authAndRole, validateParams(tournamentIdParamsSchema), validateBody(createBodySchema.partial())] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<z.infer<typeof createBodySchema>>;
      const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });

      const existing = await prisma.tournament.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Tournament not found' });

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.visibility !== undefined) updateData.visibility = body.visibility;
      if (body.entryFee !== undefined) updateData.entryFee = body.entryFee;
      if (body.prizePool !== undefined) updateData.prizePool = body.prizePool;
      if (body.maxPlayers !== undefined) updateData.maxPlayers = body.maxPlayers;
      if (body.minPlayers !== undefined) updateData.minPlayers = body.minPlayers;
      if (body.startsAt !== undefined) updateData.startsAt = new Date(body.startsAt);
      if (body.registrationEndsAt !== undefined) updateData.registrationEndsAt = body.registrationEndsAt ? new Date(body.registrationEndsAt) : null;

      const updated = await prisma.tournament.update({ where: { id }, data: updateData as any });

      await recordAudit(prisma, request.user!.id, actor!.role, id, 'EDIT_TOURNAMENT', request.ip, { changes: Object.keys(updateData) });
      return reply.send(updated);
    },
  );

  app.delete(
    '/api/admin/tournaments/:id',
    { preHandler: [...authAndRole, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });

      const existing = await prisma.tournament.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Tournament not found' });

      await prisma.tournament.delete({ where: { id } });
      await recordAudit(prisma, request.user!.id, actor!.role, id, 'DELETE_TOURNAMENT', request.ip, { name: existing.name });
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/tournaments/:id/open',
    { preHandler: [...authAndRole, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });

      const existing = await prisma.tournament.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Tournament not found' });
      if (existing.status !== 'DRAFT') return reply.status(400).send({ error: 'Only draft tournaments can be opened for registration' });

      await prisma.tournament.update({ where: { id }, data: { status: 'REGISTRATION' } });
      await recordAudit(prisma, request.user!.id, actor!.role, id, 'OPEN_REGISTRATION', request.ip);
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/tournaments/:id/close',
    { preHandler: [...authAndRole, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });

      const existing = await prisma.tournament.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Tournament not found' });
      if (existing.status !== 'REGISTRATION') return reply.status(400).send({ error: 'Registration is not open' });

      const playerCount = await prisma.tournamentPlayer.count({ where: { tournamentId: id } });
      if (playerCount < existing.minPlayers) return reply.status(400).send({ error: `Need at least ${existing.minPlayers} players to start` });

      await prisma.tournament.update({ where: { id }, data: { status: 'READY' } });
      await recordAudit(prisma, request.user!.id, actor!.role, id, 'CLOSE_REGISTRATION', request.ip);
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/tournaments/:id/start',
    { preHandler: [...authAndRole, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });

      const existing = await prisma.tournament.findUnique({
        where: { id },
        include: { _count: { select: { players: true } } },
      });
      if (!existing) return reply.status(404).send({ error: 'Tournament not found' });
      if (existing.status !== 'READY') return reply.status(400).send({ error: 'Tournament must be in READY state' });
      if (existing._count.players < existing.minPlayers) return reply.status(400).send({ error: `Need at least ${existing.minPlayers} players` });

      await tournaments.generateBracket(id);
      await prisma.tournament.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
      await recordAudit(prisma, request.user!.id, actor!.role, id, 'START_TOURNAMENT', request.ip);
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/tournaments/:id/finish',
    { preHandler: [...authAndRole, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });

      const existing = await prisma.tournament.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Tournament not found' });
      if (existing.status !== 'IN_PROGRESS') return reply.status(400).send({ error: 'Tournament must be in progress' });

      await prisma.tournament.update({ where: { id }, data: { status: 'FINISHED' } });
      await recordAudit(prisma, request.user!.id, actor!.role, id, 'FINISH_TOURNAMENT', request.ip);
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/tournaments/:id/cancel',
    { preHandler: [...authAndRole, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });

      const existing = await prisma.tournament.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Tournament not found' });
      if (['FINISHED', 'CANCELLED'].includes(existing.status)) return reply.status(400).send({ error: 'Tournament already finished or cancelled' });

      await prisma.tournament.update({ where: { id }, data: { status: 'CANCELLED' } });
      await recordAudit(prisma, request.user!.id, actor!.role, id, 'CANCEL_TOURNAMENT', request.ip);
      return reply.send({ success: true });
    },
  );
}