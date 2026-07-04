import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { SocialService } from '../social-service';
import { authMiddleware } from '../auth/middleware';
import { requireRole } from '../auth/authorization';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const blockBodySchema = z.object({
  blockerId: z.string().min(1),
  blockedId: z.string().min(1),
});

async function recordAudit(prisma: PrismaClient, actorId: string, action: string, targetId: string, ip?: string, metadata?: Record<string, unknown>) {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
  await prisma.auditLog.create({
    data: {
      actorId, actorRole: (actor?.role ?? 'SUPER_ADMIN') as any,
      targetId, action, ip, metadata: metadata ?? {},
    },
  });
}

export function registerAdminSocialRoutes(app: FastifyInstance, prisma: PrismaClient, social: SocialService): void {
  const authAndRole = [authMiddleware, requireRole(prisma, 'SUPER_ADMIN')];

  app.get(
    '/api/admin/social/friends/:userId',
    { preHandler: authAndRole },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };
      const friends = await social.getFriends(userId);
      return reply.send({ friends });
    },
  );

  app.get(
    '/api/admin/social/blocked/:userId',
    { preHandler: authAndRole },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };
      const users = await social.getBlockedUsers(userId);
      return reply.send({ users });
    },
  );

  app.post(
    '/api/admin/social/block',
    { preHandler: [...authAndRole, validateBody(blockBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { blockerId, blockedId } = request.body as { blockerId: string; blockedId: string };
      try {
        await social.blockUser(blockerId, blockedId);
        await recordAudit(prisma, request.user!.id, 'ADMIN_BLOCK_USER', blockedId, request.ip, { blockerId });
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.post(
    '/api/admin/social/unblock',
    { preHandler: [...authAndRole, validateBody(blockBodySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { blockerId, blockedId } = request.body as { blockerId: string; blockedId: string };
      try {
        await social.unblockUser(blockerId, blockedId);
        await recordAudit(prisma, request.user!.id, 'ADMIN_UNBLOCK_USER', blockerId, request.ip, { blockerId });
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );
}