import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TournamentService } from './tournament-service';
import type { ConnectionManager } from './connection-manager';

function mockPrisma() {
  return {
    tournament: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tournamentPlayer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    tournamentMatch: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  } as any;
}

function mockConnections() {
  return {
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn(),
    getUserId: vi.fn(),
    getConnectionIdByUserId: vi.fn(),
  } as unknown as ConnectionManager;
}

describe('TournamentService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let connections: ReturnType<typeof mockConnections>;
  let svc: TournamentService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = mockPrisma();
    connections = mockConnections();
    svc = new TournamentService(prisma as any, connections);
  });

  describe('listTournaments', () => {
    it('returns paginated tournaments', async () => {
      const now = new Date('2026-07-01');
      prisma.tournament.findMany.mockResolvedValue([
        {
          id: 't1', name: 'Test', description: 'Desc', type: 'SINGLE_ELIMINATION', status: 'REGISTRATION',
          visibility: 'PUBLIC', entryFee: 0, prizePool: 0, maxPlayers: 16, minPlayers: 2,
          startsAt: now, registrationEndsAt: null, createdAt: now, createdById: 'u1',
          _count: { players: 3 }, createdBy: { id: 'u1', displayName: 'Admin' },
        },
      ]);
      prisma.tournament.count.mockResolvedValue(1);

      const result = await svc.listTournaments({});
      expect(result.tournaments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.tournaments[0].playerCount).toBe(3);
    });
  });

  describe('getTournament', () => {
    it('returns null for missing tournament', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);
      expect(await svc.getTournament('bad')).toBeNull();
    });

    it('returns tournament detail with bracket and players', async () => {
      const now = new Date('2026-07-01');
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', name: 'Test', description: 'Desc', type: 'SINGLE_ELIMINATION', status: 'IN_PROGRESS',
        visibility: 'PUBLIC', entryFee: 0, prizePool: 100, maxPlayers: 8, minPlayers: 2,
        startsAt: now, registrationEndsAt: null, createdAt: now, createdById: 'u1', createdBy: { id: 'u1', displayName: 'Admin' },
        _count: { players: 4 },
        players: [
          { id: 'tp1', userId: 'u1', status: 'ACTIVE', seed: 1, registeredAt: now, user: { id: 'u1', username: 'p1', displayName: 'Player 1' } },
          { id: 'tp2', userId: 'u2', status: 'ACTIVE', seed: 2, registeredAt: now, user: { id: 'u2', username: 'p2', displayName: 'Player 2' } },
        ],
        matches: [
          { id: 'm1', round: 1, matchIndex: 0, player1Id: 'u1', player2Id: 'u2', winnerId: null, status: 'PENDING', player1Score: 0, player2Score: 0, startedAt: null, completedAt: null },
        ],
        prizes: [
          { id: 'pr1', position: 1, label: 'Winner', amount: 100, percentage: null },
        ],
      });

      const result = await svc.getTournament('t1');
      expect(result).not.toBeNull();
      expect(result!.bracket).toHaveLength(1);
      expect(result!.players).toHaveLength(2);
      expect(result!.prizes).toHaveLength(1);
    });
  });

  describe('register', () => {
    it('throws if tournament not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);
      await expect(svc.register('t1', 'u1')).rejects.toThrow('Tournament not found');
    });

    it('throws if registration not open', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', status: 'DRAFT', maxPlayers: 16, entryFee: 0,
        _count: { players: 0 },
      });
      await expect(svc.register('t1', 'u1')).rejects.toThrow('Registration is not open');
    });

    it('throws if tournament full', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', status: 'REGISTRATION', maxPlayers: 2, entryFee: 0,
        _count: { players: 2 },
      });
      await expect(svc.register('t1', 'u1')).rejects.toThrow('Tournament is full');
    });

    it('throws if already registered', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', status: 'REGISTRATION', maxPlayers: 16, entryFee: 0,
        _count: { players: 1 },
      });
      prisma.tournamentPlayer.findUnique.mockResolvedValue({ id: 'tp1', userId: 'u1' });
      await expect(svc.register('t1', 'u1')).rejects.toThrow('Already registered');
    });

    it('throws if free user tries paid tournament', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', status: 'REGISTRATION', maxPlayers: 16, entryFee: 10,
        _count: { players: 0 },
      });
      prisma.tournamentPlayer.findUnique.mockResolvedValue(null);
      prisma.subscription.findUnique.mockResolvedValue({ plan: { planType: 'FREE' } });

      await expect(svc.register('t1', 'u1')).rejects.toThrow('Premium subscription required');
    });

    it('registers successfully', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', status: 'REGISTRATION', maxPlayers: 16, entryFee: 0,
        _count: { players: 0 },
      });
      prisma.tournamentPlayer.findUnique.mockResolvedValue(null);
      prisma.tournamentPlayer.count.mockResolvedValue(0);
      prisma.tournamentPlayer.create.mockResolvedValue({ id: 'tp1' });

      const result = await svc.register('t1', 'u1');
      expect(result.success).toBe(true);
      expect(result.playerCount).toBe(1);
    });
  });

  describe('unregister', () => {
    it('throws if tournament not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);
      await expect(svc.unregister('t1', 'u1')).rejects.toThrow('Tournament not found');
    });

    it('throws if tournament is already in progress', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', status: 'IN_PROGRESS',
      });
      await expect(svc.unregister('t1', 'u1')).rejects.toThrow('Cannot unregister at this stage');
    });

    it('throws if not registered', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', status: 'REGISTRATION',
      });
      prisma.tournamentPlayer.deleteMany.mockResolvedValue({ count: 0 });
      await expect(svc.unregister('t1', 'u1')).rejects.toThrow('Not registered');
    });

    it('unregisters successfully', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1', status: 'REGISTRATION',
      });
      prisma.tournamentPlayer.deleteMany.mockResolvedValue({ count: 1 });
      prisma.tournamentPlayer.count.mockResolvedValue(2);

      const result = await svc.unregister('t1', 'u1');
      expect(result.success).toBe(true);
      expect(result.playerCount).toBe(2);
    });
  });

  describe('getPlayerStatus', () => {
    it('returns registered true when found', async () => {
      prisma.tournamentPlayer.findUnique.mockResolvedValue({ id: 'tp1' });
      expect(await svc.getPlayerStatus('t1', 'u1')).toEqual({ registered: true });
    });

    it('returns registered false when not found', async () => {
      prisma.tournamentPlayer.findUnique.mockResolvedValue(null);
      expect(await svc.getPlayerStatus('t1', 'u1')).toEqual({ registered: false });
    });
  });
});