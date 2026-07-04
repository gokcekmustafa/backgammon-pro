import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import type { SocialService } from '../social-service';
import { authMiddleware } from '../auth/middleware';
import type { AuthenticatedRequest } from '../auth/middleware';
import { validateQuery, validateBody, validateParams } from './validate';
import { z } from 'zod';

const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
});

const userIdParamsSchema = z.object({
  userId: z.string().min(1),
});

const invitationIdParamsSchema = z.object({
  invitationId: z.string().min(1),
});

const sendRequestSchema = z.object({
  receiverId: z.string().min(1),
});

const respondToRequestSchema = z.object({
  senderId: z.string().min(1),
  accept: z.boolean(),
});

const sendInvitationSchema = z.object({
  receiverId: z.string().min(1),
  type: z.enum(['MATCH', 'TABLE', 'TOURNAMENT']),
  targetId: z.string().optional(),
  targetName: z.string().optional(),
});

const respondInvitationSchema = z.object({
  accept: z.boolean(),
});

export function registerSocialRoutes(
  app: FastifyInstance,
  _prisma: PrismaClient,
  social: SocialService,
): void {
  app.get(
    '/api/social/search',
    { preHandler: [authMiddleware, validateQuery(searchQuerySchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { q } = request.query as { q: string };
      const results = await social.searchPlayers(q, request.user!.id);
      return reply.send({ results });
    },
  );

  app.get(
    '/api/social/friends',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const friends = await social.getFriends(request.user!.id);
      return reply.send({ friends });
    },
  );

  app.get(
    '/api/social/requests',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const [requests, sent] = await Promise.all([
        social.getFriendRequests(request.user!.id),
        social.getSentRequests(request.user!.id),
      ]);
      return reply.send({ requests, sent });
    },
  );

  app.post(
    '/api/social/requests',
    { preHandler: [authMiddleware, validateBody(sendRequestSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { receiverId } = request.body as { receiverId: string };
      try {
        const result = await social.sendFriendRequest(request.user!.id, receiverId);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.put(
    '/api/social/requests/respond',
    { preHandler: [authMiddleware, validateBody(respondToRequestSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { senderId, accept } = request.body as { senderId: string; accept: boolean };
      try {
        if (accept) {
          await social.acceptFriendRequest(request.user!.id, senderId);
        } else {
          await social.rejectFriendRequest(request.user!.id, senderId);
        }
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.put(
    '/api/social/requests/:userId/cancel',
    { preHandler: [authMiddleware, validateParams(userIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };
      try {
        await social.cancelFriendRequest(request.user!.id, userId);
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.delete(
    '/api/social/friends/:userId',
    { preHandler: [authMiddleware, validateParams(userIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };
      try {
        await social.removeFriend(request.user!.id, userId);
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.post(
    '/api/social/block',
    { preHandler: [authMiddleware, validateBody(sendRequestSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { receiverId } = request.body as { receiverId: string };
      try {
        await social.blockUser(request.user!.id, receiverId);
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.post(
    '/api/social/unblock',
    { preHandler: [authMiddleware, validateBody(sendRequestSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { receiverId } = request.body as { receiverId: string };
      try {
        await social.unblockUser(request.user!.id, receiverId);
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.get(
    '/api/social/blocked',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const users = await social.getBlockedUsers(request.user!.id);
      return reply.send({ users });
    },
  );

  app.post(
    '/api/social/invitations',
    { preHandler: [authMiddleware, validateBody(sendInvitationSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof sendInvitationSchema>;
      try {
        await social.sendInvitation(request.user!.id, body.receiverId, body.type, body.targetId, body.targetName);
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.get(
    '/api/social/invitations',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const invitations = await social.getInvitations(request.user!.id);
      return reply.send({ invitations });
    },
  );

  app.put(
    '/api/social/invitations/:invitationId',
    { preHandler: [authMiddleware, validateParams(invitationIdParamsSchema), validateBody(respondInvitationSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { invitationId } = request.params as { invitationId: string };
      const { accept } = request.body as { accept: boolean };
      try {
        await social.respondToInvitation(invitationId, request.user!.id, accept);
        return reply.send({ success: true });
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  // Privacy check endpoint (for admin social moderation)
  app.get(
    '/api/social/privacy/:userId',
    { preHandler: [authMiddleware, validateParams(userIdParamsSchema)] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };
      const allowed = await social.checkPrivacy(userId, request.user!.id);
      return reply.send({ allowed });
    },
  );
}