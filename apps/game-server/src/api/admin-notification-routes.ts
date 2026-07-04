import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient, UserRole, NotificationType } from '@backgammon/database';
import type { NotificationService } from '../notification-service';
import type { ConnectionManager } from '../connection-manager';
import type { RoomManager } from '../room-manager';
import type { TableManager } from '../table-manager';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const notificationTypeValues = [
  'SYSTEM_ANNOUNCEMENT',
  'MAINTENANCE_NOTICE',
  'USER_WARNING',
  'MODERATOR_MESSAGE',
  'FRIEND_REQUEST',
  'TOURNAMENT_INVITATION',
  'MATCH_INVITATION',
  'ACHIEVEMENT_UNLOCKED',
] as const;

const broadcastBodySchema = z.object({
  type: z.enum(notificationTypeValues),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  expiresInMinutes: z.number().int().positive().optional(),
});

const scheduleBodySchema = broadcastBodySchema.extend({
  key: z.string().min(1).max(100),
  delayMinutes: z.number().int().positive(),
});

const cancelBodySchema = z.object({
  key: z.string().min(1).max(100),
});

async function recordAudit(
  prisma: PrismaClient,
  actorId: string,
  actorRole: UserRole,
  action: string,
  ip?: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: { actorId, actorRole, action, ip, metadata: metadata ?? {} },
  });
}

function getExpiresAt(expiresInMinutes?: number): Date | undefined {
  if (!expiresInMinutes) return undefined;
  return new Date(Date.now() + expiresInMinutes * 60 * 1000);
}

export function registerAdminNotificationRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  notifications: NotificationService,
  connections: ConnectionManager,
  rooms: RoomManager,
  tables: TableManager,
): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  async function getAllUserIds(prisma: PrismaClient): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async function getUserIdsByRole(role: UserRole): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: { role, deletedAt: null },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  function getUserIdsByRoom(roomId: string): string[] {
    const room = rooms.get(roomId);
    if (!room) return [];
    return room.connectionIds
      .map((cid) => connections.getUserId(cid))
      .filter((uid): uid is string => !!uid);
  }

  function getUserIdsByTable(tableId: string): string[] {
    const table = tables.get(tableId);
    if (!table) return [];
    return table.connectionIds
      .map((cid) => connections.getUserId(cid))
      .filter((uid): uid is string => !!uid);
  }

  function buildInputs(
    userIds: string[],
    body: z.infer<typeof broadcastBodySchema>,
    createdBy: string,
  ) {
    const expiresAt = getExpiresAt(body.expiresInMinutes);
    return userIds.map((uid) => ({
      userId: uid,
      type: body.type as NotificationType,
      title: body.title,
      body: body.body,
      priority: body.priority as any,
      expiresAt,
      createdBy,
    }));
  }

  app.post(
    '/api/admin/notifications/broadcast',
    { preHandler: [...authAndRole, validateBody(broadcastBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof broadcastBodySchema>;
      const userIds = await getAllUserIds(prisma);
      const inputs = buildInputs(userIds, body, request.user!.id);
      await notifications.createForMultiple(inputs);
      await recordAudit(prisma, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, 'NOTIFICATION_BROADCAST', request.ip, { count: userIds.length, type: body.type, title: body.title });
      return reply.send({ success: true, count: userIds.length });
    },
  );

  app.post(
    '/api/admin/notifications/broadcast/role',
    { preHandler: [...authAndRole, validateBody(broadcastBodySchema.extend({ role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER']) }))] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof broadcastBodySchema> & { role: UserRole };
      const userIds = await getUserIdsByRole(body.role);
      const inputs = buildInputs(userIds, body, request.user!.id);
      await notifications.createForMultiple(inputs);
      await recordAudit(prisma, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, 'NOTIFICATION_BROADCAST_ROLE', request.ip, { count: userIds.length, role: body.role, type: body.type, title: body.title });
      return reply.send({ success: true, count: userIds.length });
    },
  );

  app.post(
    '/api/admin/notifications/broadcast/room',
    { preHandler: [...authAndRole, validateBody(broadcastBodySchema.extend({ roomId: z.string().min(1) }))] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof broadcastBodySchema> & { roomId: string };
      const userIds = getUserIdsByRoom(body.roomId);
      if (userIds.length === 0) return reply.status(404).send({ error: 'No users found in room' });
      const inputs = buildInputs(userIds, body, request.user!.id);
      await notifications.createForMultiple(inputs);
      await recordAudit(prisma, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, 'NOTIFICATION_BROADCAST_ROOM', request.ip, { count: userIds.length, roomId: body.roomId, type: body.type, title: body.title });
      return reply.send({ success: true, count: userIds.length });
    },
  );

  app.post(
    '/api/admin/notifications/broadcast/table',
    { preHandler: [...authAndRole, validateBody(broadcastBodySchema.extend({ tableId: z.string().min(1) }))] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof broadcastBodySchema> & { tableId: string };
      const userIds = getUserIdsByTable(body.tableId);
      if (userIds.length === 0) return reply.status(404).send({ error: 'No users found at table' });
      const inputs = buildInputs(userIds, body, request.user!.id);
      await notifications.createForMultiple(inputs);
      await recordAudit(prisma, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, 'NOTIFICATION_BROADCAST_TABLE', request.ip, { count: userIds.length, tableId: body.tableId, type: body.type, title: body.title });
      return reply.send({ success: true, count: userIds.length });
    },
  );

  app.post(
    '/api/admin/notifications/schedule',
    { preHandler: [...authAndRole, validateBody(scheduleBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof scheduleBodySchema>;
      const userIds = await getAllUserIds(prisma);
      const expiresAt = getExpiresAt(body.expiresInMinutes);
      notifications.schedule(
        body.key,
        {
          userIds,
          type: body.type as NotificationType,
          title: body.title,
          body: body.body,
          priority: body.priority as any,
          expiresAt,
          createdBy: request.user!.id,
        },
        body.delayMinutes * 60 * 1000,
      );
      await recordAudit(prisma, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, 'NOTIFICATION_SCHEDULE', request.ip, { key: body.key, delayMinutes: body.delayMinutes, type: body.type, title: body.title });
      return reply.send({ success: true, key: body.key, delayMinutes: body.delayMinutes });
    },
  );

  app.post(
    '/api/admin/notifications/schedule/cancel',
    { preHandler: [...authAndRole, validateBody(cancelBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof cancelBodySchema>;
      const cancelled = notifications.cancelSchedule(body.key);
      if (!cancelled) return reply.status(404).send({ error: 'No scheduled notification found with that key' });
      await recordAudit(prisma, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, 'NOTIFICATION_CANCEL_SCHEDULE', request.ip, { key: body.key });
      return reply.send({ success: true, key: body.key });
    },
  );
}
