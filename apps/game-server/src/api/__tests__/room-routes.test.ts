import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listRoomsHandler, createRoomHandler } from '../room-routes';

function mockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    room: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    ...overrides,
  } as any;
}

describe('listRoomsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of rooms with open table counts', async () => {
    const prisma = mockPrisma();
    prisma.room.findMany.mockResolvedValue([
      {
        id: 'r1',
        name: 'Beginners',
        slug: 'beginners',
        description: 'For new players',
        sortOrder: 1,
        _count: { tables: 3 },
      },
      {
        id: 'r2',
        name: 'Advanced',
        slug: 'advanced',
        description: 'Experienced players',
        sortOrder: 2,
        _count: { tables: 1 },
      },
    ]);

    const result = await listRoomsHandler(prisma);

    expect(result.status).toBe(200);
    expect(result.body.rooms).toHaveLength(2);
    expect(result.body.rooms[0].name).toBe('Beginners');
    expect(result.body.rooms[0].openTableCount).toBe(3);
    expect(result.body.rooms[1].openTableCount).toBe(1);
  });

  it('returns empty array when no rooms exist', async () => {
    const prisma = mockPrisma();
    prisma.room.findMany.mockResolvedValue([]);

    const result = await listRoomsHandler(prisma);

    expect(result.status).toBe(200);
    expect(result.body.rooms).toEqual([]);
  });

  it('only returns active rooms ordered by sortOrder', async () => {
    const prisma = mockPrisma();
    prisma.room.findMany.mockImplementation((args) => {
      expect(args.where.isActive).toBe(true);
      expect(args.orderBy.sortOrder).toBe('asc');
      return Promise.resolve([]);
    });

    await listRoomsHandler(prisma);
    expect(prisma.room.findMany).toHaveBeenCalled();
  });
});

describe('createRoomHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    const prisma = mockPrisma();
    const result = await createRoomHandler(prisma, { name: '', slug: 'test' });
    expect(result.status).toBe(400);
    expect(result.body).toHaveProperty('error');
  });

  it('returns 400 when slug is missing', async () => {
    const prisma = mockPrisma();
    const result = await createRoomHandler(prisma, { name: 'Test', slug: '' });
    expect(result.status).toBe(400);
  });

  it('returns 409 when slug already exists', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue({ id: 'r1' });

    const result = await createRoomHandler(prisma, { name: 'Test', slug: 'test' });

    expect(result.status).toBe(409);
    expect(result.body).toHaveProperty('error');
  });

  it('creates room successfully', async () => {
    const prisma = mockPrisma();
    prisma.room.findUnique.mockResolvedValue(null);
    prisma.room.create.mockResolvedValue({ id: 'new-id', name: 'Test Room', slug: 'test-room' });

    const result = await createRoomHandler(prisma, {
      name: 'Test Room',
      slug: 'test-room',
      description: 'A test room',
    });

    expect(result.status).toBe(201);
    expect(result.body.room.name).toBe('Test Room');
    expect(result.body.room.slug).toBe('test-room');
    expect(prisma.room.create).toHaveBeenCalledWith({
      data: { name: 'Test Room', slug: 'test-room', description: 'A test room' },
    });
  });
});
