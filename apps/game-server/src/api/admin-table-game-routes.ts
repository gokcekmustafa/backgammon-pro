import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient, UserRole } from '@backgammon/database';
import type { TableManager } from '../table-manager';
import type { GameSessionManager } from '../game-session-manager';
import { validateParams, validateBody } from './validate';
import { adminUserIdParamsSchema } from './validation';
import { z } from 'zod';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';

const tableIdParamsSchema = z.object({
  id: z.string().min(1, 'Table ID is required'),
});

const warningBodySchema = z.object({
  message: z.string().min(1, 'Message is required').max(500),
});

const broadcastBodySchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000),
});

const removePlayerBodySchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
});

const forceResignBodySchema = z.object({
  player: z.number().int().refine((v) => v === 1 || v === 2, { message: 'Player must be 1 or 2' }),
});

async function recordAudit(
  prisma: PrismaClient,
  actorId: string,
  actorRole: UserRole,
  action: string,
  targetId?: string,
  ip?: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole,
      targetId,
      action,
      ip,
      metadata: metadata ?? {},
    },
  });
}

export function registerAdminTableGameRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  tables: TableManager,
  gameSessions: GameSessionManager,
): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  app.get(
    '/api/admin/tables',
    { preHandler: authAndRole },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const allTables = tables.getAll();
      const now = Date.now();
      return reply.send({
        tables: allTables.map((t) => ({
          id: t.id,
          roomId: t.roomId,
          name: t.name,
          status: t.status,
          locked: t.locked,
          playerCount: t.connectionIds.length,
          spectatorCount: t.spectatorIds.length,
          createdAt: new Date(t.createdAt).toISOString(),
          duration: now - t.createdAt,
        })),
      });
    },
  );

  app.get(
    '/api/admin/games',
    { preHandler: authAndRole },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const sessions = gameSessions.getAllSessions();
      return reply.send({ games: sessions });
    },
  );

  app.put(
    '/api/admin/tables/:id/lock',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const success = tables.lock(id);
      if (!success) return reply.status(404).send({ error: 'Table not found' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'LOCK_TABLE', id, request.ip);
      return reply.send({ success: true });
    },
  );

  app.put(
    '/api/admin/tables/:id/unlock',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const success = tables.unlock(id);
      if (!success) return reply.status(404).send({ error: 'Table not found' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'UNLOCK_TABLE', id, request.ip);
      return reply.send({ success: true });
    },
  );

  app.put(
    '/api/admin/tables/:id/close',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const success = tables.closeTable(id);
      if (!success) return reply.status(404).send({ error: 'Table not found' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'CLOSE_TABLE', id, request.ip);
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/tables/:id/remove-player',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema), validateBody(removePlayerBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { connectionId } = request.body as { connectionId: string };
      const success = tables.removePlayer(id, connectionId);
      if (!success) return reply.status(404).send({ error: 'Table or player not found' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'FORCE_REMOVE_PLAYER', id, request.ip, { connectionId });
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/tables/:id/warning',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema), validateBody(warningBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { message } = request.body as { message: string };
      const success = tables.sendWarning(id, message);
      if (!success) return reply.status(404).send({ error: 'Table not found' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'SEND_WARNING', id, request.ip, { message });
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/tables/:id/broadcast',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema), validateBody(broadcastBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { message } = request.body as { message: string };
      const success = tables.broadcastMessage(id, message);
      if (!success) return reply.status(404).send({ error: 'Table not found' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'BROADCAST_MESSAGE', id, request.ip, { message });
      return reply.send({ success: true });
    },
  );

  app.put(
    '/api/admin/games/:id/pause',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const success = gameSessions.pauseSession(id);
      if (!success) return reply.status(404).send({ error: 'Game not found or not active' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'PAUSE_GAME', id, request.ip);
      return reply.send({ success: true });
    },
  );

  app.put(
    '/api/admin/games/:id/resume',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const success = gameSessions.resumeSession(id);
      if (!success) return reply.status(404).send({ error: 'Game not found or not paused' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'RESUME_GAME', id, request.ip);
      return reply.send({ success: true });
    },
  );

  app.put(
    '/api/admin/games/:id/terminate',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const success = gameSessions.terminateSession(id);
      if (!success) return reply.status(404).send({ error: 'Game not found' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'TERMINATE_GAME', id, request.ip);
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/games/:id/force-resign',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema), validateBody(forceResignBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { player } = request.body as { player: 1 | 2 };
      const success = gameSessions.forceResignPlayer(id, player);
      if (!success) return reply.status(404).send({ error: 'Game not found or not active' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'FORCE_RESIGN', id, request.ip, { player });
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/games/:id/force-draw',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const success = gameSessions.forceDraw(id);
      if (!success) return reply.status(404).send({ error: 'Game not found or not active' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'FORCE_DRAW', id, request.ip);
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/admin/games/:id/kick',
    { preHandler: [...authAndRole, validateParams(tableIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const success = gameSessions.terminateSession(id);
      if (!success) return reply.status(404).send({ error: 'Game not found' });
      const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } });
      await recordAudit(prisma, request.user!.id, user!.role, 'KICK_SPECTATOR', id, request.ip);
      return reply.send({ success: true });
    },
  );
}
