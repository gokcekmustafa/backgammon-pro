import type { PrismaClient, PlayerType } from '@backgammon/database';
import { randomUUID } from 'crypto';
import { hashPassword, comparePassword } from './lib/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './lib/jwt';
import type { SecurityService } from './security-service';

export interface DeviceInfo {
  ip: string;
  userAgent: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  id: string;
  playerType: string;
  playerId: string;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
  expiresAt: string;
  lastAccessedAt: string;
  createdAt: string;
}

async function resolvePlayerType(prisma: PrismaClient, playerId: string): Promise<'user' | 'guest'> {
  const user = await prisma.user.findUnique({ where: { id: playerId }, select: { id: true } });
  if (user) return 'user';
  return 'guest';
}

export class SessionManager {
  constructor(
    private prisma: PrismaClient,
    private security: SecurityService,
    private concurrentSessionLimit: number = 5,
  ) {}

  async createSession(
    playerType: 'user' | 'guest',
    playerId: string,
    device?: DeviceInfo,
  ): Promise<SessionTokens> {
    await this.enforceSessionLimit(playerType, playerId);

    const sessionId = randomUUID();
    const refreshToken = signRefreshToken({ sub: playerId, sessionId });
    const accessToken = signAccessToken({ sub: playerId, type: playerType });
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    const refreshHash = await hashPassword(refreshToken);

    await this.prisma.session.create({
      data: {
        playerType,
        playerId,
        token: refreshHash,
        tokenFamily: sessionId,
        ipAddress: device?.ip ?? null,
        userAgent: device?.userAgent ?? null,
        expiresAt,
        lastAccessedAt: new Date(),
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshSession(
    refreshToken: string,
    device?: DeviceInfo,
  ): Promise<SessionTokens | null> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      await this.security.log({
        eventType: 'INVALID_REFRESH_TOKEN',
        severity: 'WARN',
        details: { reason: 'invalid_or_expired_token' },
      });
      return null;
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        playerId: payload.sub,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    let matchedSession: any = null;
    for (const session of sessions) {
      const match = await comparePassword(refreshToken, session.token);
      if (match) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      // Token rotation abuse detected — revoke all sessions for this user
      await this.prisma.session.updateMany({
        where: { playerId: payload.sub, isActive: true },
        data: { isActive: false },
      });
      await this.security.log({
        eventType: 'TOKEN_ABUSE',
        severity: 'ERROR',
        userId: payload.sub,
        details: { reason: 'refresh_token_reuse' },
      });
      return null;
    }

    // Rotate: revoke old token, create new one
    const playerType = matchedSession.playerType as 'user' | 'guest';
    const newSessionId = randomUUID();
    const newRefreshToken = signRefreshToken({ sub: payload.sub, sessionId: newSessionId });
    const newAccessToken = signAccessToken({ sub: payload.sub, type: playerType });
    const newExpiresAt = new Date(Date.now() + 7 * 86400000);
    const newRefreshHash = await hashPassword(newRefreshToken);

    await this.prisma.session.update({
      where: { id: matchedSession.id },
      data: {
        token: newRefreshHash,
        tokenFamily: newSessionId,
        expiresAt: newExpiresAt,
        lastAccessedAt: new Date(),
        ipAddress: device?.ip ?? matchedSession.ipAddress,
        userAgent: device?.userAgent ?? matchedSession.userAgent,
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async revokeSession(refreshToken: string): Promise<boolean> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return false;
    }

    const sessions = await this.prisma.session.findMany({
      where: { playerId: payload.sub, isActive: true },
    });

    for (const session of sessions) {
      const match = await comparePassword(refreshToken, session.token);
      if (match) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: { isActive: false },
        });
        return true;
      }
    }
    return false;
  }

  async revokeAllUserSessions(playerId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { playerId, isActive: true },
      data: { isActive: false },
    });
    await this.security.log({
      eventType: 'SESSION_REVOKED',
      severity: 'INFO',
      userId: playerId,
      details: { reason: 'all_sessions_revoked' },
    });
  }

  async getUserSessions(playerId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.session.findMany({
      where: { playerId },
      orderBy: { lastAccessedAt: 'desc' },
      take: 50,
    });
    return sessions.map((s) => ({
      id: s.id,
      playerType: s.playerType,
      playerId: s.playerId,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      isActive: s.isActive,
      expiresAt: s.expiresAt.toISOString(),
      lastAccessedAt: s.lastAccessedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async getActiveSessionCount(playerId: string): Promise<number> {
    return this.prisma.session.count({
      where: { playerId, isActive: true, expiresAt: { gt: new Date() } },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private async enforceSessionLimit(
    playerType: string,
    playerId: string,
  ): Promise<void> {
    const activeCount = await this.getActiveSessionCount(playerId);
    if (activeCount >= this.concurrentSessionLimit) {
      // Revoke the oldest active session
      const oldest = await this.prisma.session.findFirst({
        where: { playerId, isActive: true, expiresAt: { gt: new Date() } },
        orderBy: { lastAccessedAt: 'asc' },
      });
      if (oldest) {
        await this.prisma.session.update({
          where: { id: oldest.id },
          data: { isActive: false },
        });
        await this.security.log({
          eventType: 'CONCURRENT_SESSION_LIMIT',
          severity: 'WARN',
          userId: playerId,
          details: {
            reason: 'oldest_session_revoked',
            sessionId: oldest.id,
          },
        });
      }
    }
  }
}