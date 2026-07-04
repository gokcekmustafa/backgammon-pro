import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient, UserRole } from '@backgammon/database';
import { validateParams, validateBody, validateQuery } from './validate';
import {
  adminListUsersQuerySchema,
  adminUserIdParamsSchema,
  adminChangeRoleBodySchema,
  adminToggleStatusBodySchema,
  adminToggleBanBodySchema,
  adminToggleModeratorBodySchema,
  adminAuditLogQuerySchema,
} from './validation';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';

async function recordAudit(
  prisma: PrismaClient,
  actorId: string,
  actorRole: UserRole,
  action: string,
  targetId?: string,
  ip?: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole,
      targetId,
      action,
      ip,
      metadata: metadata ?? {},
    },
  });
}

export interface ListUsersQuery {
  offset?: string;
  limit?: string;
  search?: string;
  role?: string;
  banned?: string;
  deleted?: string;
}

export async function listUsersHandler(
  prisma: PrismaClient,
  query: ListUsersQuery,
) {
  const offset = Math.max(0, parseInt(query.offset ?? '0', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
  const search = query.search?.trim() ?? '';
  const role = query.role as UserRole | undefined;
  const banned = query.banned === 'true' ? true : query.banned === 'false' ? false : undefined;
  const deleted = query.deleted === 'true' ? true : query.deleted === 'false' ? false : undefined;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (banned === true) {
    where.bannedAt = { not: null };
  } else if (banned === false) {
    where.bannedAt = null;
  }

  if (deleted === true) {
    where.deletedAt = { not: null };
  } else if (deleted === false) {
    where.deletedAt = null;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        bannedAt: true,
        deletedAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.user.count({ where: where as any }),
  ]);

  return {
    status: 200 as const,
    body: {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        isActive: u.isActive,
        bannedAt: u.bannedAt?.toISOString() ?? null,
        deletedAt: u.deletedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      total,
      offset,
      limit,
    },
  };
}

export interface UserIdParams {
  id: string;
}

export async function getUserHandler(prisma: PrismaClient, params: UserIdParams) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      bannedAt: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      profile: {
        select: {
          avatarUrl: true,
          bio: true,
          location: true,
        },
      },
      _count: {
        select: {
          convertedGuests: true,
        },
      },
    },
  });

  if (!user) {
    return { status: 404 as const, body: { error: 'User not found' } };
  }

  return {
    status: 200 as const,
    body: {
      ...user,
      bannedAt: user.bannedAt?.toISOString() ?? null,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    },
  };
}

export interface ChangeRoleBody {
  role: UserRole;
}

export async function changeRoleHandler(
  prisma: PrismaClient,
  params: UserIdParams,
  body: ChangeRoleBody,
  actorId: string,
  actorRole: UserRole,
  ip?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });

  if (!user) {
    return { status: 404 as const, body: { error: 'User not found' } };
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { role: body.role },
    select: { id: true, email: true, username: true, displayName: true, role: true },
  });

  await recordAudit(prisma, actorId, actorRole, 'CHANGE_ROLE', params.id, ip, {
    fromRole: user.role,
    toRole: body.role,
  });

  return { status: 200 as const, body: { user: updated } };
}

export interface ToggleStatusBody {
  isActive: boolean;
}

export async function toggleStatusHandler(
  prisma: PrismaClient,
  params: UserIdParams,
  body: ToggleStatusBody,
  actorId: string,
  actorRole: UserRole,
  ip?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, isActive: true },
  });

  if (!user) {
    return { status: 404 as const, body: { error: 'User not found' } };
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { isActive: body.isActive },
    select: { id: true, email: true, username: true, displayName: true, isActive: true },
  });

  await recordAudit(prisma, actorId, actorRole, body.isActive ? 'ENABLE' : 'DISABLE', params.id, ip, {
    previousState: user.isActive,
  });

  return { status: 200 as const, body: { user: updated } };
}

export interface ToggleBanBody {
  banned: boolean;
}

export async function toggleBanHandler(
  prisma: PrismaClient,
  params: UserIdParams,
  body: ToggleBanBody,
  actorId: string,
  actorRole: UserRole,
  ip?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, bannedAt: true },
  });

  if (!user) {
    return { status: 404 as const, body: { error: 'User not found' } };
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { bannedAt: body.banned ? new Date() : null },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bannedAt: true,
    },
  });

  await recordAudit(prisma, actorId, actorRole, body.banned ? 'BAN' : 'UNBAN', params.id, ip, {
    previousBannedAt: user.bannedAt?.toISOString() ?? null,
  });

  return {
    status: 200 as const,
    body: {
      user: {
        ...updated,
        bannedAt: updated.bannedAt?.toISOString() ?? null,
      },
    },
  };
}

export async function deleteUserHandler(
  prisma: PrismaClient,
  params: UserIdParams,
  actorId: string,
  actorRole: UserRole,
  ip?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, deletedAt: true },
  });

  if (!user) {
    return { status: 404 as const, body: { error: 'User not found' } };
  }

  if (user.deletedAt) {
    return { status: 409 as const, body: { error: 'User is already deleted' } };
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
    select: { id: true, email: true, username: true, displayName: true, deletedAt: true },
  });

  await recordAudit(prisma, actorId, actorRole, 'DELETE', params.id, ip);

  return {
    status: 200 as const,
    body: {
      user: {
        ...updated,
        deletedAt: updated.deletedAt?.toISOString() ?? null,
      },
    },
  };
}

export async function listBannedUsersHandler(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    where: { bannedAt: { not: null }, deletedAt: null },
    orderBy: { bannedAt: 'desc' },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bannedAt: true,
    },
  });

  return {
    status: 200 as const,
    body: {
      users: users.map((u) => ({
        ...u,
        bannedAt: u.bannedAt!.toISOString(),
      })),
    },
  };
}

export async function listModeratorsHandler(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    where: { role: { in: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  return {
    status: 200 as const,
    body: { users },
  };
}

export interface ToggleModeratorBody {
  promote: boolean;
}

export async function toggleModeratorHandler(
  prisma: PrismaClient,
  params: UserIdParams,
  body: ToggleModeratorBody,
  actorId: string,
  actorRole: UserRole,
  ip?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });

  if (!user) {
    return { status: 404 as const, body: { error: 'User not found' } };
  }

  if (body.promote && user.role === 'MODERATOR') {
    return { status: 409 as const, body: { error: 'User is already a moderator' } };
  }

  if (!body.promote && user.role !== 'MODERATOR') {
    return { status: 409 as const, body: { error: 'User is not a moderator' } };
  }

  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    return { status: 409 as const, body: { error: 'Cannot change role of admins via moderator endpoint' } };
  }

  const newRole: UserRole = body.promote ? 'MODERATOR' : 'USER';

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { role: newRole },
    select: { id: true, email: true, username: true, displayName: true, role: true },
  });

  await recordAudit(prisma, actorId, actorRole, body.promote ? 'PROMOTE_MODERATOR' : 'DEMOTE_MODERATOR', params.id, ip, {
    previousRole: user.role,
    newRole,
  });

  return { status: 200 as const, body: { user: updated } };
}

export interface AuditLogQuery {
  offset?: string;
  limit?: string;
}

export async function listAuditLogsHandler(
  prisma: PrismaClient,
  query: AuditLogQuery,
) {
  const offset = Math.max(0, parseInt(query.offset ?? '0', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const targetIds = [...new Set(logs.filter((l) => l.targetId).map((l) => l.targetId!))];
  const allIds = [...new Set([...actorIds, ...targetIds])];
  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true, username: true, displayName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    status: 200 as const,
    body: {
      logs: logs.map((l) => ({
        id: l.id,
        actor: userMap.get(l.actorId) ?? null,
        target: l.targetId ? (userMap.get(l.targetId) ?? null) : null,
        action: l.action,
        ip: l.ip,
        metadata: l.metadata,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      offset,
      limit,
    },
  };
}

export async function dashboardHandler(prisma: PrismaClient) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalUsers, bannedUsers, newUsersToday] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { bannedAt: { not: null }, deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
  ]);

  return {
    status: 200 as const,
    body: {
      totalUsers,
      onlineUsers: 0,
      activeTables: 0,
      gamesToday: 0,
      newUsersToday,
      bannedUsers,
    },
  };
}

export function registerAdminRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  app.get(
    '/api/admin/dashboard',
    { preHandler: authAndRole },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await dashboardHandler(prisma);
      return reply.status(result.status).send(result.body);
    },
  );

  app.get(
    '/api/admin/users',
    { preHandler: [...authAndRole, validateQuery(adminListUsersQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as ListUsersQuery;
      const result = await listUsersHandler(prisma, query);
      return reply.status(result.status).send(result.body);
    },
  );

  app.get(
    '/api/admin/users/banned',
    { preHandler: authAndRole },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await listBannedUsersHandler(prisma);
      return reply.status(result.status).send(result.body);
    },
  );

  app.get(
    '/api/admin/users/moderators',
    { preHandler: authAndRole },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await listModeratorsHandler(prisma);
      return reply.status(result.status).send(result.body);
    },
  );

  app.get(
    '/api/admin/audit',
    { preHandler: [...authAndRole, validateQuery(adminAuditLogQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as AuditLogQuery;
      const result = await listAuditLogsHandler(prisma, query);
      return reply.status(result.status).send(result.body);
    },
  );

  app.get(
    '/api/admin/users/:id',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as UserIdParams;
      const result = await getUserHandler(prisma, params);
      return reply.status(result.status).send(result.body);
    },
  );

  app.put(
    '/api/admin/users/:id/role',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema), validateBody(adminChangeRoleBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const params = request.params as UserIdParams;
      const body = request.body as ChangeRoleBody;
      const ip = request.ip;
      const result = await changeRoleHandler(
        prisma,
        params,
        body,
        request.user!.id,
        (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role,
        ip,
      );
      return reply.status(result.status).send(result.body);
    },
  );

  app.put(
    '/api/admin/users/:id/status',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema), validateBody(adminToggleStatusBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const params = request.params as UserIdParams;
      const body = request.body as ToggleStatusBody;
      const ip = request.ip;
      const result = await toggleStatusHandler(
        prisma,
        params,
        body,
        request.user!.id,
        (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role,
        ip,
      );
      return reply.status(result.status).send(result.body);
    },
  );

  app.put(
    '/api/admin/users/:id/ban',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema), validateBody(adminToggleBanBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const params = request.params as UserIdParams;
      const body = request.body as ToggleBanBody;
      const ip = request.ip;
      const result = await toggleBanHandler(
        prisma,
        params,
        body,
        request.user!.id,
        (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role,
        ip,
      );
      return reply.status(result.status).send(result.body);
    },
  );

  app.delete(
    '/api/admin/users/:id',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const params = request.params as UserIdParams;
      const ip = request.ip;
      const result = await deleteUserHandler(
        prisma,
        params,
        request.user!.id,
        (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role,
        ip,
      );
      return reply.status(result.status).send(result.body);
    },
  );

  app.put(
    '/api/admin/users/:id/moderator',
    { preHandler: [...authAndRole, validateParams(adminUserIdParamsSchema), validateBody(adminToggleModeratorBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const params = request.params as UserIdParams;
      const body = request.body as ToggleModeratorBody;
      const ip = request.ip;
      const result = await toggleModeratorHandler(
        prisma,
        params,
        body,
        request.user!.id,
        (await prisma.user.findUnique({ where: { id: request.user!.id }, select: { role: true } }))!.role,
        ip,
      );
      return reply.status(result.status).send(result.body);
    },
  );
}
