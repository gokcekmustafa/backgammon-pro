import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import { comparePassword, hashPassword } from '../lib/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { validateBody } from '../api/validate';
import { loginSchema, guestLoginSchema, refreshSchema, logoutSchema } from '../api/validation';
import type { SessionManager, DeviceInfo } from '../session-manager';
import type { SecurityService } from '../security-service';

export interface LoginBody {
  email?: string;
  password?: string;
}

export interface GuestLoginBody {
  displayName?: string;
}

export interface RefreshBody {
  refreshToken?: string;
}

export interface LogoutBody {
  refreshToken?: string;
}

function extractDevice(request: FastifyRequest): DeviceInfo {
  return {
    ip: request.ip ?? request.headers['x-forwarded-for'] as string ?? 'unknown',
    userAgent: request.headers['user-agent'] ?? 'unknown',
  };
}

export function registerAuthRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  sessions: SessionManager,
  security: SecurityService,
): void {
  app.post(
    '/auth/login',
    { preHandler: [validateBody(loginSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as LoginBody;
      const { email, password } = body;

      if (!email || !password) {
        return reply.status(400).send({ error: 'Email and password are required' });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        await security.log({
          eventType: 'FAILED_LOGIN',
          severity: 'WARN',
          details: { email },
          ipAddress: request.ip,
        });
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        await security.log({
          eventType: 'FAILED_LOGIN',
          severity: 'WARN',
          userId: user.id,
          details: { email },
          ipAddress: request.ip,
        });

        const recentFails = await security.countByUser(user.id, 'FAILED_LOGIN', new Date(Date.now() - 3600000));
        if (recentFails >= 5) {
          await sessions.revokeAllUserSessions(user.id);
        }

        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      const device = extractDevice(request);
      const tokens = await sessions.createSession('user', user.id, device);

      return reply.status(200).send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        },
      });
    },
  );

  app.post(
    '/auth/guest-login',
    { preHandler: [validateBody(guestLoginSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as GuestLoginBody;
      const displayName = body?.displayName?.trim() ?? 'Guest';

      const guest = await prisma.guestUser.create({
        data: { displayName, lastSeenAt: new Date() },
      });

      const device = extractDevice(request);
      const tokens = await sessions.createSession('guest', guest.id, device);

      return reply.status(200).send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        guest: { id: guest.id, displayName: guest.displayName },
      });
    },
  );

  app.post(
    '/auth/refresh',
    { preHandler: [validateBody(refreshSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as RefreshBody;
      if (!body.refreshToken) {
        return reply.status(400).send({ error: 'Refresh token is required' });
      }

      const device = extractDevice(request);
      const tokens = await sessions.refreshSession(body.refreshToken, device);

      if (!tokens) {
        return reply.status(401).send({ error: 'Invalid or expired refresh token' });
      }

      return reply.status(200).send(tokens);
    },
  );

  app.post(
    '/auth/logout',
    { preHandler: [validateBody(logoutSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as LogoutBody;
      if (!body.refreshToken) {
        return reply.status(400).send({ error: 'Refresh token is required' });
      }

      await sessions.revokeSession(body.refreshToken);
      return reply.status(200).send({ message: 'Logged out successfully' });
    },
  );

  app.post('/auth/logout-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    try {
      const { verifyAccessToken } = await import('../lib/jwt');
      const payload = verifyAccessToken(header.slice(7));
      await sessions.revokeAllUserSessions(payload.sub);
      return reply.status(200).send({ message: 'All sessions revoked' });
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  app.get(
    '/auth/sessions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const header = request.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      try {
        const { verifyAccessToken } = await import('../lib/jwt');
        const payload = verifyAccessToken(header.slice(7));
        const userSessions = await sessions.getUserSessions(payload.sub);
        return reply.status(200).send({ sessions: userSessions });
      } catch {
        return reply.status(401).send({ error: 'Invalid token' });
      }
    },
  );
}