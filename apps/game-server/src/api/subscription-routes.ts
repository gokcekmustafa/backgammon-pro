import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { SubscriptionService } from '../subscription-service';
import { authMiddleware } from '../auth/middleware';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateQuery } from './validate';
import { z } from 'zod';

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function registerSubscriptionRoutes(
  app: FastifyInstance,
  _prisma: PrismaClient,
  subs: SubscriptionService,
): void {
  app.get(
    '/api/subscription/plans',
    async (_request, reply: FastifyReply) => {
      const plans = await subs.getPlans();
      return reply.send({ plans });
    },
  );

  app.get(
    '/api/subscription',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const sub = await subs.getUserSubscription(request.user!.id);
      if (!sub) return reply.send({ subscription: null });
      return reply.send({ subscription: sub });
    },
  );

  app.get(
    '/api/subscription/history',
    { preHandler: [authMiddleware, validateQuery(historyQuerySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const query = request.query as { limit?: number };
      const payments = await subs.getPaymentHistory(request.user!.id, query.limit);
      return reply.send({ payments });
    },
  );
}
