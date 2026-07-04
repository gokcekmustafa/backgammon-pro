import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { TournamentService } from '../tournament-service';
import { authMiddleware } from '../auth/middleware';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateQuery, validateParams } from './validate';
import { z } from 'zod';

const listQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().optional(),
  type: z.string().optional(),
});

const tournamentIdParamsSchema = z.object({
  id: z.string().min(1),
});

export function registerTournamentRoutes(
  app: FastifyInstance,
  _prisma: PrismaClient,
  tournaments: TournamentService,
): void {
  app.get(
    '/api/tournaments',
    { preHandler: [validateQuery(listQuerySchema)] },
    async (request, reply: FastifyReply) => {
      const query = request.query as { offset?: number; limit?: number; status?: string; type?: string };
      const result = await tournaments.listTournaments(query);
      return reply.send(result);
    },
  );

  app.get(
    '/api/tournaments/:id',
    { preHandler: [validateParams(tournamentIdParamsSchema)] },
    async (request, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const tournament = await tournaments.getTournament(id);
      if (!tournament) return reply.status(404).send({ error: 'Tournament not found' });
      return reply.send(tournament);
    },
  );

  app.post(
    '/api/tournaments/:id/register',
    { preHandler: [authMiddleware, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const result = await tournaments.register(id, request.user!.id);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.post(
    '/api/tournaments/:id/unregister',
    { preHandler: [authMiddleware, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const result = await tournaments.unregister(id, request.user!.id);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.get(
    '/api/tournaments/:id/status',
    { preHandler: [authMiddleware, validateParams(tournamentIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const result = await tournaments.getPlayerStatus(id, request.user!.id);
      return reply.send(result);
    },
  );
}