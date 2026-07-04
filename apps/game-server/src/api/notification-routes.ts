import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { NotificationService } from '../notification-service';
import { authMiddleware } from '../auth/middleware';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateQuery } from './validate';
import { z } from 'zod';

const listNotificationsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  isRead: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  isArchived: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

const notificationIdParamsSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
});

export function registerNotificationRoutes(
  app: FastifyInstance,
  _prisma: PrismaClient,
  notifications: NotificationService,
): void {
  app.get(
    '/api/notifications',
    { preHandler: [authMiddleware, validateQuery(listNotificationsQuerySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const result = listNotificationsQuerySchema.safeParse(request.query);
      const query = result.success ? result.data : {};
      const r = await notifications.list(request.user!.id, {
        offset: query.offset,
        limit: query.limit,
        isRead: query.isRead,
        isArchived: query.isArchived,
        priority: query.priority,
      });
      return reply.send(r);
    },
  );

  app.get(
    '/api/notifications/unread',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const count = await notifications.countUnread(request.user!.id);
      return reply.send({ count });
    },
  );

  app.patch(
    '/api/notifications/:id/read',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const ok = await notifications.markRead(id, request.user!.id);
      if (!ok) return reply.status(404).send({ error: 'Notification not found' });
      return reply.send({ success: true });
    },
  );

  app.patch(
    '/api/notifications/read-all',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const count = await notifications.markAllRead(request.user!.id);
      return reply.send({ success: true, count });
    },
  );

  app.patch(
    '/api/notifications/:id/archive',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const ok = await notifications.archive(id, request.user!.id);
      if (!ok) return reply.status(404).send({ error: 'Notification not found' });
      return reply.send({ success: true });
    },
  );

  app.delete(
    '/api/notifications/:id',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const ok = await notifications.delete(id, request.user!.id);
      if (!ok) return reply.status(404).send({ error: 'Notification not found' });
      return reply.send({ success: true });
    },
  );
}
