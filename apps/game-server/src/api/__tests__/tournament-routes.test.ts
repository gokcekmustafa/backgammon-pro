import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerTournamentRoutes } from '../tournament-routes';
import { TournamentService } from '../../tournament-service';
import { signAccessToken } from '../../lib/jwt';

function mockTournamentService() {
  return {
    listTournaments: vi.fn(),
    getTournament: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    getPlayerStatus: vi.fn(),
  } as unknown as TournamentService;
}

function buildApp(tournaments: TournamentService) {
  const app = Fastify();
  registerTournamentRoutes(app, {} as any, tournaments);
  return app;
}

function authHeaders(userId = 'u1') {
  const token = signAccessToken({ sub: userId, type: 'user' });
  return { authorization: `Bearer ${token}` };
}

describe('tournament-routes', () => {
  let tournaments: ReturnType<typeof mockTournamentService>;

  beforeEach(() => {
    vi.clearAllMocks();
    tournaments = mockTournamentService();
  });

  describe('GET /api/tournaments', () => {
    it('returns tournaments list', async () => {
      const app = buildApp(tournaments);
      tournaments.listTournaments.mockResolvedValue({ tournaments: [{ id: 't1', name: 'Test', type: 'SINGLE_ELIMINATION', status: 'REGISTRATION', visibility: 'PUBLIC', entryFee: 0, prizePool: 0, maxPlayers: 16, minPlayers: 2, startsAt: '2026-07-01T00:00:00.000Z', registrationEndsAt: null, playerCount: 3, createdBy: { id: 'u1', displayName: 'Admin' }, createdAt: '2026-07-01T00:00:00.000Z' }], total: 1 });

      const res = await app.inject({ method: 'GET', url: '/api/tournaments' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.tournaments).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });

  describe('GET /api/tournaments/:id', () => {
    it('returns tournament detail', async () => {
      const app = buildApp(tournaments);
      tournaments.getTournament.mockResolvedValue({ id: 't1', name: 'Test', type: 'SINGLE_ELIMINATION', status: 'IN_PROGRESS', bracket: [], players: [], prizes: [] });

      const res = await app.inject({ method: 'GET', url: '/api/tournaments/t1' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).id).toBe('t1');
    });

    it('returns 404 if not found', async () => {
      const app = buildApp(tournaments);
      tournaments.getTournament.mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/tournaments/none' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/tournaments/:id/register', () => {
    it('registers user', async () => {
      const app = buildApp(tournaments);
      tournaments.register.mockResolvedValue({ success: true, playerCount: 5 });

      const res = await app.inject({ method: 'POST', url: '/api/tournaments/t1/register', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).playerCount).toBe(5);
    });

    it('returns 400 on error', async () => {
      const app = buildApp(tournaments);
      tournaments.register.mockRejectedValue(new Error('Tournament full'));

      const res = await app.inject({ method: 'POST', url: '/api/tournaments/t1/register', headers: authHeaders() });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Tournament full');
    });
  });

  describe('POST /api/tournaments/:id/unregister', () => {
    it('unregisters user', async () => {
      const app = buildApp(tournaments);
      tournaments.unregister.mockResolvedValue({ success: true, playerCount: 3 });

      const res = await app.inject({ method: 'POST', url: '/api/tournaments/t1/unregister', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/tournaments/:id/status', () => {
    it('returns registration status', async () => {
      const app = buildApp(tournaments);
      tournaments.getPlayerStatus.mockResolvedValue({ registered: true });

      const res = await app.inject({ method: 'GET', url: '/api/tournaments/t1/status', headers: authHeaders() });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).registered).toBe(true);
    });
  });
});