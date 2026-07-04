import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateQuery } from './validate';
import { z } from 'zod';
import type { SecurityService } from '../security-service';
import type { SessionManager } from '../session-manager';
import type { RateLimiter } from '../rate-limiter';
import type { MonitoringService } from '../monitoring-service';

const securityEventsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  eventType: z.string().max(50).optional(),
  severity: z.string().max(20).optional(),
  userId: z.string().min(1).optional(),
});

export function registerAdminSecurityRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  security: SecurityService,
  sessions: SessionManager,
  rateLimiter: RateLimiter,
  monitoring: MonitoringService,
): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  // Security Dashboard summary
  app.get('/api/admin/security/summary', { preHandler: authAndRole }, async (_request: AuthenticatedRequest, reply: FastifyReply) => {
    const summary = await security.getSummary();
    const metrics = await monitoring.getMetrics();
    return reply.send({ ...summary, connections: metrics.connections, games: metrics.games });
  });

  // Security events log
  app.get('/api/admin/security/events', { preHandler: [...authAndRole, validateQuery(securityEventsQuerySchema)] }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const query = request.query as z.infer<typeof securityEventsQuerySchema>;
    const result = await security.getEvents({
      offset: query.offset,
      limit: query.limit,
      eventType: query.eventType,
      severity: query.severity,
      userId: query.userId,
    });
    return reply.send(result);
  });

  // Active sessions for a user
  app.get('/api/admin/security/sessions/:userId', { preHandler: authAndRole }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    const userSessions = await sessions.getUserSessions(userId);
    return reply.send({ sessions: userSessions });
  });

  // Revoke all sessions for a user
  app.post('/api/admin/security/sessions/:userId/revoke', { preHandler: authAndRole }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    await sessions.revokeAllUserSessions(userId);
    return reply.send({ success: true });
  });

  // Rate limiter stats
  app.get('/api/admin/security/rate-limiter', { preHandler: authAndRole }, async (_request: AuthenticatedRequest, reply: FastifyReply) => {
    const stats = rateLimiter.getStats();
    return reply.send(stats);
  });

  // Reset rate limiter for user
  app.post('/api/admin/security/rate-limiter/reset-user/:userId', { preHandler: authAndRole }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    rateLimiter.resetUser(userId);
    return reply.send({ success: true });
  });

  // Online users count
  app.get('/api/admin/security/online', { preHandler: authAndRole }, async (_request: AuthenticatedRequest, reply: FastifyReply) => {
    const metrics = await monitoring.getMetrics();
    return reply.send({ onlineUsers: metrics.connections.activeUsers, totalConnections: metrics.connections.totalConnections });
  });

  // Metrics endpoint
  app.get('/api/admin/metrics', { preHandler: authAndRole }, async (_request: AuthenticatedRequest, reply: FastifyReply) => {
    const metrics = await monitoring.getMetrics();
    return reply.send(metrics);
  });
}