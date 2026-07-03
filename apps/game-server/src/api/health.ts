import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { WebSocketServer } from 'ws';

export function registerHealthCheck(
  app: FastifyInstance,
  prisma: PrismaClient,
  wss?: WebSocketServer,
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
}
