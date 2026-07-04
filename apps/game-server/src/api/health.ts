import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { WebSocketServer } from 'ws';
import type { MonitoringService } from '../monitoring-service';
import type { CacheService } from '../cache-service';

export function registerHealthCheck(
  app: FastifyInstance,
  prisma: PrismaClient,
  wss?: WebSocketServer,
  monitoring?: MonitoringService,
  cache?: CacheService,
): void {
  app.get('/api/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      reply.status(200).send({
        status: 'ok',
        database: 'connected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch {
      reply.status(503).send({
        status: 'error',
        database: 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get('/api/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, string> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
    }

    checks.websocket = wss ? 'running' : 'not_available';

    const allOk = checks.database === 'connected';
    reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ready' : 'not_ready',
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!monitoring) {
      return reply.status(503).send({ error: 'Monitoring not available' });
    }
    const start = Date.now();
    const metrics = await monitoring.getMetrics();
    monitoring.recordResponseTime(Date.now() - start);
    return reply.send(metrics);
  });

  app.get('/api/cache/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!cache) {
      return reply.status(503).send({ error: 'Cache not available' });
    }
    return reply.send(cache.getStats());
  });
}