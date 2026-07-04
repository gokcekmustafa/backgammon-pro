import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { SubscriptionService } from '../subscription-service';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateQuery, validateBody, validateParams } from './validate';
import { z } from 'zod';

const paginationQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const changePlanBodySchema = z.object({
  planType: z.enum(['FREE', 'PREMIUM', 'VIP']),
});

const extendBodySchema = z.object({
  days: z.number().int().positive(),
});

const adminUserIdParamsSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

export function registerAdminSubscriptionRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  subs: SubscriptionService,
): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  app.get(
    '/api/admin/subscriptions',
    { preHandler: [...authAndRole, validateQuery(paginationQuerySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const query = request.query as { offset?: number; limit?: number };
      const result = await subs.listAllSubscriptions(query.offset, query.limit);
      return reply.send(result);
    },
  );

  app.get(
    '/api/admin/payments',
    { preHandler: [...authAndRole, validateQuery(paginationQuerySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const query = request.query as { offset?: number; limit?: number };
      const result = await subs.listAllPayments(query.offset, query.limit);
      return reply.send(result);
    },
  );

  app.put(
    '/api/admin/subscriptions/:id/plan',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema), validateBody(changePlanBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { planType } = request.body as { planType: 'FREE' | 'PREMIUM' | 'VIP' };
      try {
        const sub = await subs.changePlan(id, planType, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, request.ip);
        return reply.send(sub);
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.post(
    '/api/admin/subscriptions/:id/cancel',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const sub = await subs.cancelSubscription(id, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, request.ip);
        return reply.send(sub);
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.post(
    '/api/admin/subscriptions/:id/extend',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema), validateBody(extendBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { days } = request.body as { days: number };
      try {
        const sub = await subs.extendSubscription(id, days, request.user!.id, (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role, request.ip);
        return reply.send(sub);
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );
}
