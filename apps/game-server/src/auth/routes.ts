import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@backgammon/database';
import { randomUUID } from 'crypto';
import { comparePassword, hashPassword } from '../lib/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { validateBody } from '../api/validate';
import { loginSchema, guestLoginSchema, refreshSchema, logoutSchema } from '../api/validation';

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

export async function loginHandler(prisma: PrismaClient, body: LoginBody) {
  const { email, password } = body;

  if (!email || !password) {
    return { status: 400 as const, body: { error: 'Email and password are required' } };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { status: 401 as const, body: { error: 'Invalid email or password' } };
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return { status: 401 as const, body: { error: 'Invalid email or password' } };
  }

  const sessionId = randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, sessionId });
  const accessToken = signAccessToken({ sub: user.id, type: 'user' });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshHash = await hashPassword(refreshToken);

  await prisma.session.create({
    data: {
      playerType: 'user',
      playerId: user.id,
      token: refreshHash,
      expiresAt,
    },
  });

  return {
    status: 200 as const,
    body: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
    },
  };
}

export async function guestLoginHandler(prisma: PrismaClient, body: GuestLoginBody) {
  const displayName = body?.displayName?.trim() ?? 'Guest';

  const guest = await prisma.guestUser.create({
    data: {
      displayName,
      lastSeenAt: new Date(),
    },
  });

  const sessionId = randomUUID();
  const refreshToken = signRefreshToken({ sub: guest.id, sessionId });
  const accessToken = signAccessToken({ sub: guest.id, type: 'guest' });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshHash = await hashPassword(refreshToken);

  await prisma.session.create({
    data: {
      playerType: 'guest',
      playerId: guest.id,
      token: refreshHash,
      expiresAt,
    },
  });

  return {
    status: 200 as const,
    body: {
      accessToken,
      refreshToken,
      guest: {
        id: guest.id,
        displayName: guest.displayName,
      },
    },
  };
}

export async function refreshHandler(prisma: PrismaClient, body: RefreshBody) {
  const { refreshToken } = body;

  if (!refreshToken) {
    return { status: 400 as const, body: { error: 'Refresh token is required' } };
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return { status: 401 as const, body: { error: 'Invalid or expired refresh token' } };
  }

  const refreshHash = await hashPassword(refreshToken);
  const session = await prisma.session.findFirst({
    where: {
      playerType: payload.type as 'user' | 'guest',
      playerId: payload.sub,
      token: refreshHash,
      isActive: true,
    },
  });

  if (!session) {
    return { status: 401 as const, body: { error: 'Session not found or revoked' } };
  }

  if (session.expiresAt < new Date()) {
    return { status: 401 as const, body: { error: 'Session expired' } };
  }

  const newSessionId = randomUUID();
  const newRefreshToken = signRefreshToken({ sub: payload.sub, sessionId: newSessionId });
  const newAccessToken = signAccessToken({
    sub: payload.sub,
    type: payload.type as 'user' | 'guest',
  });
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newRefreshHash = await hashPassword(newRefreshToken);

  await prisma.session.update({
    where: { id: session.id },
    data: { token: newRefreshHash, expiresAt: newExpiresAt, lastAccessedAt: new Date() },
  });

  return {
    status: 200 as const,
    body: { accessToken: newAccessToken, refreshToken: newRefreshToken },
  };
}

export async function logoutHandler(prisma: PrismaClient, body: LogoutBody) {
  const { refreshToken } = body;

  if (!refreshToken) {
    return { status: 400 as const, body: { error: 'Refresh token is required' } };
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return { status: 401 as const, body: { error: 'Invalid or expired refresh token' } };
  }

  const refreshHash = await hashPassword(refreshToken);
  await prisma.session.updateMany({
    where: {
      playerType: payload.type as 'user' | 'guest',
      playerId: payload.sub,
      token: refreshHash,
      isActive: true,
    },
    data: { isActive: false },
  });

  return { status: 200 as const, body: { message: 'Logged out successfully' } };
}

export function registerAuthRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.post(
    '/auth/login',
    { preHandler: [validateBody(loginSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await loginHandler(prisma, request.body as LoginBody);
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/auth/guest-login',
    { preHandler: [validateBody(guestLoginSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await guestLoginHandler(prisma, request.body as GuestLoginBody);
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/auth/refresh',
    { preHandler: [validateBody(refreshSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await refreshHandler(prisma, request.body as RefreshBody);
      return reply.status(result.status).send(result.body);
    },
  );

  app.post(
    '/auth/logout',
    { preHandler: [validateBody(logoutSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await logoutHandler(prisma, request.body as LogoutBody);
      return reply.status(result.status).send(result.body);
    },
  );
}
