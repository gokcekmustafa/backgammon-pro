import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listTablesHandler,
  createTableHandler,
  joinTableHandler,
  leaveTableHandler,
  closeTableHandler,
  finishTableHandler,
} from '../table-routes';

function mockPrisma(overrides: Record<string, unknown> = {}) {
  const prisma = {
    room: { findUnique: vi.fn() },
    table: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tableParticipant: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((cb: (tx: any) => Promise<any>) => cb(prisma)),
    ...overrides,
  };
  return prisma as any;
}

const authUser = { id: 'u1', type: 'user' as const };
const guestAuth = { id: 'g1', type: 'guest' as const };

// ── listTablesHandler ──────────────────────────────────────────────────

describe('listTablesHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when room not found', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue(null);

    const result = await listTablesHandler(prisma, { roomId: 'bad' });

    expect(result.status).toBe(404);
  });

  it('returns tables for a room', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.table.findMany.mockResolvedValue([
      {
        id: 't1',
        name: 'Test Table',
        roomId: 'r1',
        status: 'open',
        isRanked: true,
        matchLength: 1,
        createdAt: new Date('2026-01-01'),
        _count: { participants: 1 },
        participants: [{ id: 'p1', playerType: 'user', playerId: 'u1', position: 1 }],
      },
    ]);

    const result = await listTablesHandler(prisma, { roomId: 'r1' });

    expect(result.status).toBe(200);
    expect(result.body.tables).toHaveLength(1);
    expect(result.body.tables[0].participantCount).toBe(1);
    expect(result.body.tables[0].participants[0].playerId).toBe('u1');
  });

  it('returns open, occupied, playing, and finished tables', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.table.findMany.mockResolvedValue([]);

    await listTablesHandler(prisma, { roomId: 'r1' });

    expect(prisma.table.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['open', 'occupied', 'playing', 'finished'] },
        }),
      }),
    );
  });
});

// ── createTableHandler ─────────────────────────────────────────────────

describe('createTableHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when roomId is missing', async () => {
    const prisma = mockPrisma();
    const result = await createTableHandler(prisma, { roomId: '' }, authUser);
    expect(result.status).toBe(400);
  });

  it('returns 404 when room not found', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue(null);

    const result = await createTableHandler(prisma, { roomId: 'bad' }, authUser);

    expect(result.status).toBe(404);
  });

  it('returns 409 when user is already in another table', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue({ id: 'r1', name: 'Beginners' });
    prisma.tableParticipant.findFirst.mockResolvedValue({ id: 'existing' });

    const result = await createTableHandler(prisma, { roomId: 'r1' }, authUser);

    expect(result.status).toBe(409);
  });

  it('creates table with user as participant 1', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue({ id: 'r1', name: 'Beginners' });
    prisma.tableParticipant.findFirst.mockResolvedValue(null);
    prisma.table.create.mockResolvedValue({
      id: 't1',
      name: "Player's Table",
      roomId: 'r1',
      status: 'open',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date('2026-01-01'),
      participants: [{ id: 'p1', playerType: 'user', playerId: 'u1', position: 1 }],
    });

    const result = await createTableHandler(prisma, { roomId: 'r1' }, authUser);

    expect(result.status).toBe(201);
    expect(result.body.table.status).toBe('open');
    expect(result.body.table.participantCount).toBe(1);

    expect(prisma.table.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: 'r1',
          participants: expect.objectContaining({
            create: expect.objectContaining({
              playerType: 'user',
              playerId: 'u1',
              position: 1,
            }),
          }),
        }),
      }),
    );
  });

  it('creates table for guest user', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue({ id: 'r1', name: 'Beginners' });
    prisma.tableParticipant.findFirst.mockResolvedValue(null);
    prisma.table.create.mockResolvedValue({
      id: 't1',
      name: "Guest's Table",
      roomId: 'r1',
      status: 'open',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date('2026-01-01'),
      participants: [{ id: 'p1', playerType: 'guest', playerId: 'g1', position: 1 }],
    });

    const result = await createTableHandler(prisma, { roomId: 'r1' }, guestAuth);

    expect(result.status).toBe(201);
    expect(result.body.table.participantCount).toBe(1);
  });

  it('uses custom name when provided', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue({ id: 'r1', name: 'Beginners' });
    prisma.tableParticipant.findFirst.mockResolvedValue(null);
    prisma.table.create.mockResolvedValue({
      id: 't1',
      name: 'My Table',
      roomId: 'r1',
      status: 'open',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date(),
      participants: [{ id: 'p1', playerType: 'user', playerId: 'u1', position: 1 }],
    });

    const result = await createTableHandler(prisma, { roomId: 'r1', name: 'My Table' }, authUser);

    expect(result.status).toBe(201);
    expect(prisma.table.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'My Table' }),
      }),
    );
  });
});

// ── joinTableHandler ───────────────────────────────────────────────────

describe('joinTableHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when table not found', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue(null);

    const result = await joinTableHandler(prisma, { tableId: 'bad' }, authUser);

    expect(result.status).toBe(404);
  });

  it('returns 409 when table is not open', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'playing',
      participants: [],
    });

    const result = await joinTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(409);
  });

  it('returns 409 when already in the same table', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u1' }],
    });

    const result = await joinTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(409);
  });

  it('returns 409 when already in another table', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u2', id: 'p1', position: 1 }],
    });
    prisma.tableParticipant.findFirst.mockResolvedValue({ id: 'existing' });

    const result = await joinTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(409);
  });

  it('joins table as position 2 and sets status to playing with startedAt', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u2', id: 'p1', position: 1 }],
    });
    prisma.tableParticipant.findFirst.mockResolvedValue(null);
    prisma.table.update.mockResolvedValue({
      id: 't1',
      name: 'Test Table',
      roomId: 'r1',
      status: 'playing',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date('2026-01-01'),
      participants: [
        { id: 'p1', playerType: 'user', playerId: 'u2', position: 1 },
        { id: 'p2', playerType: 'user', playerId: 'u1', position: 2 },
      ],
    });

    const result = await joinTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(200);
    expect(result.body.table.status).toBe('playing');
    expect(result.body.table.participantCount).toBe(2);

    expect(prisma.table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({
          status: 'playing',
          startedAt: expect.any(Date),
          participants: expect.objectContaining({
            create: expect.objectContaining({
              playerType: 'user',
              playerId: 'u1',
              position: 2,
            }),
          }),
        }),
      }),
    );
  });

  it('allows guest to join a table', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u2', id: 'p1', position: 1 }],
    });
    prisma.tableParticipant.findFirst.mockResolvedValue(null);
    prisma.table.update.mockResolvedValue({
      id: 't1',
      name: 'Test Table',
      roomId: 'r1',
      status: 'playing',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date(),
      participants: [
        { id: 'p1', playerType: 'user', playerId: 'u2', position: 1 },
        { id: 'p2', playerType: 'guest', playerId: 'g1', position: 2 },
      ],
    });

    const result = await joinTableHandler(prisma, { tableId: 't1' }, guestAuth);

    expect(result.status).toBe(200);
    expect(result.body.table.status).toBe('playing');
  });
});

// ── leaveTableHandler ──────────────────────────────────────────────────

describe('leaveTableHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when table not found', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue(null);

    const result = await leaveTableHandler(prisma, { tableId: 'bad' }, authUser);

    expect(result.status).toBe(404);
  });

  it('returns 404 when not a participant', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u2', id: 'p1' }],
    });

    const result = await leaveTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(404);
  });

  it('reverts table to open when one player leaves open table', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [
        { playerType: 'user', playerId: 'u1', id: 'p1' },
        { playerType: 'user', playerId: 'u2', id: 'p2' },
      ],
    });
    prisma.tableParticipant.update.mockResolvedValue({});
    prisma.table.update.mockResolvedValue({
      id: 't1',
      name: 'Test Table',
      roomId: 'r1',
      status: 'open',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date(),
      participants: [{ id: 'p2', playerType: 'user', playerId: 'u2', position: 2 }],
    });

    const result = await leaveTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(200);
    expect(result.body.table.status).toBe('open');
    expect(result.body.table.participantCount).toBe(1);
  });

  it('keeps status playing when player leaves during playing', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'playing',
      participants: [
        { playerType: 'user', playerId: 'u1', id: 'p1' },
        { playerType: 'user', playerId: 'u2', id: 'p2' },
      ],
    });
    prisma.tableParticipant.update.mockResolvedValue({});
    prisma.table.update.mockResolvedValue({
      id: 't1',
      name: 'Test Table',
      roomId: 'r1',
      status: 'playing',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date(),
      participants: [{ id: 'p2', playerType: 'user', playerId: 'u2', position: 2 }],
    });

    const result = await leaveTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(200);
    expect(result.body.table.status).toBe('playing');
    expect(result.body.table.participantCount).toBe(1);
  });

  it('closes table when last participant leaves', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u1', id: 'p1' }],
    });
    prisma.tableParticipant.update.mockResolvedValue({});
    prisma.table.update.mockResolvedValue({
      id: 't1',
      name: 'Test Table',
      roomId: 'r1',
      status: 'closed',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date(),
      participants: [],
    });

    const result = await leaveTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(200);
    expect(result.body.table.status).toBe('closed');
    expect(result.body.table.participantCount).toBe(0);
  });
});

// ── closeTableHandler ──────────────────────────────────────────────────

describe('closeTableHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when table not found', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue(null);

    const result = await closeTableHandler(prisma, { tableId: 'bad' }, authUser);

    expect(result.status).toBe(404);
  });

  it('returns 409 when table is not open (playing)', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'playing',
      participants: [{ playerType: 'user', playerId: 'u1' }],
    });

    const result = await closeTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(409);
  });

  it('returns 403 when not a participant', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u2' }],
    });

    const result = await closeTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(403);
  });

  it('closes open table successfully', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u1' }],
    });
    prisma.table.update.mockResolvedValue({
      id: 't1',
      name: 'Test Table',
      roomId: 'r1',
      status: 'closed',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date(),
      participants: [],
    });

    const result = await closeTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(200);
    expect(result.body.table.status).toBe('closed');
    expect(prisma.table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({ status: 'closed' }),
      }),
    );
  });
});

// ── finishTableHandler ─────────────────────────────────────────────────

describe('finishTableHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when table not found', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue(null);

    const result = await finishTableHandler(prisma, { tableId: 'bad' }, authUser);

    expect(result.status).toBe(404);
  });

  it('returns 409 when table is not playing', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'open',
      participants: [{ playerType: 'user', playerId: 'u1' }],
    });

    const result = await finishTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(409);
  });

  it('returns 403 when not a participant', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'playing',
      participants: [{ playerType: 'user', playerId: 'u2' }],
    });

    const result = await finishTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(403);
  });

  it('finishes a playing table successfully', async () => {
    const prisma = mockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      status: 'playing',
      participants: [{ playerType: 'user', playerId: 'u1' }],
    });
    prisma.table.update.mockResolvedValue({
      id: 't1',
      name: 'Test Table',
      roomId: 'r1',
      status: 'finished',
      isRanked: true,
      matchLength: 1,
      createdAt: new Date(),
      participants: [],
    });

    const result = await finishTableHandler(prisma, { tableId: 't1' }, authUser);

    expect(result.status).toBe(200);
    expect(result.body.table.status).toBe('finished');
    expect(prisma.table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({ status: 'finished' }),
      }),
    );
  });
});
