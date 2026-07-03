import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import { authMiddleware } from '../auth/middleware';
import { validateBody } from './validate';
import { createRoomSchema } from './validation';

export interface CreateRoomBody {
  name: string;
  slug: string;
  description?: string;
}

export async function listRoomsHandler(prisma: PrismaClient) {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          tables: {
            where: { status: { in: ['open', 'occupied'] } },
          },
        },
      },
    },
  });

  return {
    status: 200 as const,
    body: {
      rooms: rooms.map((room) => ({
        id: room.id,
        name: room.name,
        slug: room.slug,
        description: room.description,
        openTableCount: room._count.tables,
        sortOrder: room.sortOrder,
      })),
    },
  };
}

export async function createRoomHandler(prisma: PrismaClient, body: CreateRoomBody) {
  const { name, slug, description } = body;

  if (!name || !slug) {
    return { status: 400 as const, body: { error: 'Name and slug are required' } };
  }

  const existing = await prisma.room.findUnique({ where: { slug } });
  if (existing) {
    return { status: 409 as const, body: { error: 'Room with this slug already exists' } };
  }

  const room = await prisma.room.create({
    data: { name, slug, description },
  });

  return {
    status: 201 as const,
    body: { room: { id: room.id, name: room.name, slug: room.slug } },
  };
}

export function registerRoomRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/rooms', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await listRoomsHandler(prisma);
    return reply.status(result.status).send(result.body);
  });

  app.post(
    '/api/rooms',
    { preHandler: [authMiddleware, validateBody(createRoomSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as CreateRoomBody;
      const result = await createRoomHandler(prisma, body);
      return reply.status(result.status).send(result.body);
    },
  );
}
