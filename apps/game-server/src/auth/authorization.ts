import type { FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient, UserRole } from '@backgammon/database';
import type { AuthenticatedRequest } from './middleware';

export function requireRole(prisma: PrismaClient, ...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authReq = request as AuthenticatedRequest;
    if (!authReq.user) {
      reply.status(401).send({ error: 'Authentication required' });
      return;
    }
    if (authReq.user.type !== 'user') {
      reply.status(403).send({ error: 'Forbidden: guests cannot access this resource' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: { role: true },
    });

    if (!user || !roles.includes(user.role)) {
      reply.status(403).send({ error: 'Forbidden: insufficient permissions' });
    }
  };
}

export function requireAnyRole(prisma: PrismaClient, ...roles: UserRole[]) {
  return requireRole(prisma, ...roles);
}

export async function hasRole(
  prisma: PrismaClient,
  userId: string,
  ...roles: UserRole[]
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return false;
  return roles.includes(user.role);
}
