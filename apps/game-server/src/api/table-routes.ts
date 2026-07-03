import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient, TableStatus } from '@backgammon/database';
import { authMiddleware, type AuthenticatedRequest, type PlayerAuth } from '../auth/middleware';
import { validateBody, validateParams } from './validate';
import { createTableSchema, tableIdParamsSchema, roomIdParamsSchema } from './validation';

export interface CreateTableBody {
  roomId: string;
  name?: string;
  isRanked?: boolean;
  matchLength?: number;
}

interface TableParticipantRecord {
  id: string;
  playerType: string;
  playerId: string;
  position: number;
}

interface TableRecord {
  id: string;
  name: string | null;
  roomId: string;
  status: string;
  isRanked: boolean;
  matchLength: number;
  createdAt: Date;
  _count?: { participants: number };
  participants: TableParticipantRecord[];
}

function formatTable(table: TableRecord) {
  return {
    id: table.id,
    name: table.name,
    roomId: table.roomId,
    status: table.status,
    isRanked: table.isRanked,
    matchLength: table.matchLength,
    createdAt: table.createdAt.toISOString(),
    participantCount: table._count?.participants ?? table.participants.length,
    participants: table.participants.map((p) => ({
      id: p.id,
      playerType: p.playerType,
      playerId: p.playerId,
      position: p.position,
    })),
  };
}

export type TableUpdateCallback = (roomId: string) => void;
export type GameStartCallback = (tableId: string, p1UserId: string, p2UserId: string) => void;

export async function listTablesHandler(prisma: PrismaClient, params: { roomId: string }) {
  const { roomId } = params;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return { status: 404 as const, body: { error: 'Room not found' } };
  }

  const tables = await prisma.table.findMany({
    where: {
      roomId,
      status: { in: ['open', 'occupied', 'playing', 'finished'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { participants: { where: { leftAt: null } } } },
      participants: {
        where: { leftAt: null },
        select: { id: true, playerType: true, playerId: true, position: true },
      },
    },
  });

  return {
    status: 200 as const,
    body: { tables: tables.map(formatTable) },
  };
}

export async function createTableHandler(
  prisma: PrismaClient,
  body: CreateTableBody,
  auth: PlayerAuth,
) {
  const { roomId, name, isRanked, matchLength } = body;

  if (!roomId) {
    return { status: 400 as const, body: { error: 'roomId is required' } };
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return { status: 404 as const, body: { error: 'Room not found' } };
  }

  const existing = await prisma.tableParticipant.findFirst({
    where: {
      playerType: auth.type,
      playerId: auth.id,
      leftAt: null,
      table: { status: { in: ['open', 'occupied', 'playing'] } },
    },
  });
  if (existing) {
    return {
      status: 409 as const,
      body: { error: 'You are already in another table. Leave that table first.' },
    };
  }

  const tableName = name || `${auth.type === 'user' ? 'Player' : 'Guest'}'s Table`;

  const table = await prisma.table.create({
    data: {
      roomId,
      name: tableName,
      status: 'open',
      isRanked: isRanked ?? true,
      matchLength: matchLength ?? 1,
      participants: {
        create: {
          playerType: auth.type,
          playerId: auth.id,
          position: 1,
        },
      },
    },
    include: {
      participants: {
        where: { leftAt: null },
        select: { id: true, playerType: true, playerId: true, position: true },
      },
    },
  });

  return {
    status: 201 as const,
    body: { table: formatTable(table) },
  };
}

export async function joinTableHandler(
  prisma: PrismaClient,
  params: { tableId: string },
  auth: PlayerAuth,
) {
  const { tableId } = params;

  const result = await prisma.$transaction(async (tx) => {
    const table = await tx.table.findUnique({
      where: { id: tableId },
      include: {
        participants: { where: { leftAt: null } },
      },
    });

    if (!table) {
      return { status: 404 as const, body: { error: 'Table not found' } };
    }

    if (table.status !== 'open') {
      return { status: 409 as const, body: { error: 'Table is not open for joining' } };
    }

    const alreadyIn = table.participants.some(
      (p) => p.playerType === auth.type && p.playerId === auth.id,
    );
    if (alreadyIn) {
      return { status: 409 as const, body: { error: 'You are already in this table' } };
    }

    const existingParticipation = await tx.tableParticipant.findFirst({
      where: {
        playerType: auth.type,
        playerId: auth.id,
        leftAt: null,
        table: { status: { in: ['open', 'occupied', 'playing'] } },
      },
    });
    if (existingParticipation) {
      return {
        status: 409 as const,
        body: { error: 'You are already in another table. Leave that table first.' },
      };
    }

    const position = table.participants.length + 1;
    if (position > 2) {
      return { status: 409 as const, body: { error: 'Table is already full' } };
    }

    const newStatus: TableStatus = position === 2 ? 'playing' : 'open';
    const updateData: Record<string, unknown> = {
      status: newStatus,
      participants: {
        create: {
          playerType: auth.type,
          playerId: auth.id,
          position,
        },
      },
    };
    if (newStatus === 'playing') {
      updateData.startedAt = new Date();
    }

    const updated = await tx.table.update({
      where: { id: tableId },
      data: updateData,
      include: {
        participants: {
          where: { leftAt: null },
          select: { id: true, playerType: true, playerId: true, position: true },
        },
      },
    });

    return {
      status: 200 as const,
      body: { table: formatTable(updated) },
    };
  });

  return result;
}

export async function leaveTableHandler(
  prisma: PrismaClient,
  params: { tableId: string },
  auth: PlayerAuth,
) {
  const { tableId } = params;

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      participants: { where: { leftAt: null } },
    },
  });

  if (!table) {
    return { status: 404 as const, body: { error: 'Table not found' } };
  }

  const participant = table.participants.find(
    (p) => p.playerType === auth.type && p.playerId === auth.id,
  );
  if (!participant) {
    return { status: 404 as const, body: { error: 'You are not a participant of this table' } };
  }

  await prisma.tableParticipant.update({
    where: { id: participant.id },
    data: { leftAt: new Date() },
  });

  const remaining = table.participants.filter((p) => p.id !== participant.id);

  let newStatus: TableStatus | undefined;
  if (remaining.length === 0) {
    newStatus = 'closed';
  } else if (table.status === 'playing') {
    // Leave during playing: keep status, game continues / gets abandoned later
    newStatus = 'playing';
  } else {
    newStatus = 'open';
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'closed') {
    updateData.closedAt = new Date();
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: updateData,
    include: {
      participants: {
        where: { leftAt: null },
        select: { id: true, playerType: true, playerId: true, position: true },
      },
    },
  });

  return {
    status: 200 as const,
    body: { table: formatTable(updated) },
  };
}

export async function closeTableHandler(
  prisma: PrismaClient,
  params: { tableId: string },
  auth: PlayerAuth,
) {
  const { tableId } = params;

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      participants: { where: { leftAt: null } },
    },
  });

  if (!table) {
    return { status: 404 as const, body: { error: 'Table not found' } };
  }

  // Only allow closing open tables (by owner) or tables in any status by participants
  if (table.status !== 'open') {
    return { status: 409 as const, body: { error: 'Only open tables can be cancelled' } };
  }

  const isParticipant = table.participants.some(
    (p) => p.playerType === auth.type && p.playerId === auth.id,
  );
  if (!isParticipant) {
    return { status: 403 as const, body: { error: 'You are not a participant of this table' } };
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: { status: 'closed', closedAt: new Date() },
    include: {
      participants: {
        where: { leftAt: null },
        select: { id: true, playerType: true, playerId: true, position: true },
      },
    },
  });

  return {
    status: 200 as const,
    body: { table: formatTable(updated) },
  };
}

export async function finishTableHandler(
  prisma: PrismaClient,
  params: { tableId: string },
  auth: PlayerAuth,
) {
  const { tableId } = params;

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      participants: { where: { leftAt: null } },
    },
  });

  if (!table) {
    return { status: 404 as const, body: { error: 'Table not found' } };
  }

  if (table.status !== 'playing') {
    return { status: 409 as const, body: { error: 'Only playing tables can be finished' } };
  }

  const isParticipant = table.participants.some(
    (p) => p.playerType === auth.type && p.playerId === auth.id,
  );
  if (!isParticipant) {
    return { status: 403 as const, body: { error: 'You are not a participant of this table' } };
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: { status: 'finished' },
    include: {
      participants: {
        where: { leftAt: null },
        select: { id: true, playerType: true, playerId: true, position: true },
      },
    },
  });

  return {
    status: 200 as const,
    body: { table: formatTable(updated) },
  };
}

export function registerTableRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  onTableUpdate?: TableUpdateCallback,
  onGameStart?: GameStartCallback,
): void {
  app.get(
    '/api/rooms/:roomId/tables',
    { preHandler: [validateParams(roomIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await listTablesHandler(prisma, request.params as { roomId: string });
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/api/tables',
    { preHandler: [authMiddleware, validateBody(createTableSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.user) return;
      const body = request.body as CreateTableBody;
      const result = await createTableHandler(prisma, body, authRequest.user);
      if (result.status === 201 && onTableUpdate) {
        onTableUpdate(body.roomId);
      }
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/api/tables/:tableId/join',
    { preHandler: [authMiddleware, validateParams(tableIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.user) return;
      const params = request.params as { tableId: string };
      const result = await joinTableHandler(prisma, params, authRequest.user);
      if (result.status === 200) {
        if (onTableUpdate) {
          onTableUpdate(result.body.table.roomId);
        }
        const table = result.body.table as {
          id: string;
          status: string;
          participantCount: number;
          participants: Array<{ position: number; playerId: string }>;
        };
        if (onGameStart && table.status === 'playing' && table.participantCount === 2) {
          const p1 = table.participants.find((p) => p.position === 1);
          const p2 = table.participants.find((p) => p.position === 2);
          if (p1 && p2) {
            onGameStart(table.id, p1.playerId, p2.playerId);
          }
        }
      }
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/api/tables/:tableId/leave',
    { preHandler: [authMiddleware, validateParams(tableIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.user) return;
      const params = request.params as { tableId: string };
      const result = await leaveTableHandler(prisma, params, authRequest.user);
      if (result.status === 200 && onTableUpdate) {
        onTableUpdate(result.body.table.roomId);
      }
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/api/tables/:tableId/close',
    { preHandler: [authMiddleware, validateParams(tableIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.user) return;
      const params = request.params as { tableId: string };
      const result = await closeTableHandler(prisma, params, authRequest.user);
      if (result.status === 200 && onTableUpdate) {
        onTableUpdate(result.body.table.roomId);
      }
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/api/tables/:tableId/finish',
    { preHandler: [authMiddleware, validateParams(tableIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      if (!authRequest.user) return;
      const params = request.params as { tableId: string };
      const result = await finishTableHandler(prisma, params, authRequest.user);
      if (result.status === 200 && onTableUpdate) {
        onTableUpdate(result.body.table.roomId);
      }
      return reply.status(result.status).send(result.body);
    },
  );
}
