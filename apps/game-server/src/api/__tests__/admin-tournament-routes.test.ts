import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerAdminTournamentRoutes } from '../admin-tournament-routes';
import type { TournamentService } from '../../tournament-service';
import { signAccessToken } from '../../lib/jwt';

function mockTournamentService() {
  return {
    generateBracket: vi.fn(),
  } as unknown as TournamentService;
}

function authHeaders(userId = 'admin1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

function buildApp(tournaments: TournamentService) {
  const app = Fastify();

  const prisma = {
    user: {
      findUnique: vi.fn().mockImplementation(({ where: { id } }: any) => {
        if (id === 'admin1') return Promise.resolve({ id, role: 'SUPER_ADMIN' });
        return Promise.resolve(null);
      }),
    },
    tournament: {
      findUnique: vi.fn().mockImplementation(({ where: { id } }: any) => {
        if (id === 't1') return Promise.resolve({ id: 't1', name: 'Test', status: 'DRAFT', type: 'SINGLE_ELIMINATION', visibility: 'PUBLIC', entryFee: 0, prizePool: 0, maxPlayers: 16, minPlayers: 2, startsAt: new Date(), registrationEndsAt: null, createdAt: new Date(), createdById: 'admin1' });
        if (id === 't-ready') return Promise.resolve({ id: 't-ready', name: 'Ready', status: 'READY', type: 'SINGLE_ELIMINATION', minPlayers: 2, _count: { players: 4 } });
        if (id === 't-reg') return Promise.resolve({ id: 't-reg', name: 'Reg', status: 'REGISTRATION', type: 'SINGLE_ELIMINATION', minPlayers: 2 });
        if (id === 't-inprogress') return Promise.resolve({ id: 't-inprogress', name: 'IP', status: 'IN_PROGRESS', type: 'SINGLE_ELIMINATION' });
        if (id === 't-finished') return Promise.resolve({ id: 't-finished', name: 'Fin', status: 'FINISHED', type: 'SINGLE_ELIMINATION' });
        return Promise.resolve(null);
      }),
      create: vi.fn().mockResolvedValue({ id: 'new-t1', name: 'New Tourney', type: 'SINGLE_ELIMINATION' }),
      update: vi.fn().mockImplementation(({ where: { id } }: any) => Promise.resolve({ id, status: 'updated' })),
      delete: vi.fn().mockResolvedValue({ id: 't1' }),
    },
    tournamentPlayer: {
      count: vi.fn().mockResolvedValue(4),
    },
    auditLog: { create: vi.fn() },
  } as any;

  registerAdminTournamentRoutes(app, prisma, tournaments);
  return app;
}

describe('admin-tournament-routes', () => {
  let tournaments: ReturnType<typeof mockTournamentService>;

  beforeEach(() => {
    vi.clearAllMocks();
    tournaments = mockTournamentService();
  });

  describe('POST /api/admin/tournaments', () => {
    it('creates a tournament', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/tournaments',
        headers: authHeaders(),
        payload: { name: 'New Tourney', type: 'SINGLE_ELIMINATION', startsAt: '2026-08-01T00:00:00.000Z' },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('PUT /api/admin/tournaments/:id', () => {
    it('edits a tournament', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({
        method: 'PUT',
        url: '/api/admin/tournaments/t1',
        headers: authHeaders(),
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 for unknown tournament', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({
        method: 'PUT',
        url: '/api/admin/tournaments/unknown',
        headers: authHeaders(),
        payload: { name: 'Nope' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/admin/tournaments/:id', () => {
    it('deletes a tournament', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/tournaments/t1',
        headers: authHeaders(),
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/tournaments/:id/open', () => {
    it('opens registration', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({ method: 'POST', url: '/api/admin/tournaments/t1/open', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });

    it('rejects non-draft tournaments', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({ method: 'POST', url: '/api/admin/tournaments/t-inprogress/open', headers: authHeaders() });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/admin/tournaments/:id/close', () => {
    it('closes registration', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({ method: 'POST', url: '/api/admin/tournaments/t-reg/close', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/tournaments/:id/start', () => {
    it('starts tournament', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({ method: 'POST', url: '/api/admin/tournaments/t-ready/start', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/tournaments/:id/finish', () => {
    it('finishes tournament', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({ method: 'POST', url: '/api/admin/tournaments/t-inprogress/finish', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/admin/tournaments/:id/cancel', () => {
    it('cancels tournament', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({ method: 'POST', url: '/api/admin/tournaments/t1/cancel', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });

    it('rejects cancelling finished tournament', async () => {
      const app = buildApp(tournaments);
      const res = await app.inject({ method: 'POST', url: '/api/admin/tournaments/t-finished/cancel', headers: authHeaders() });
      expect(res.statusCode).toBe(400);
    });
  });
});