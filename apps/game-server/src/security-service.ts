import type { PrismaClient } from '@backgammon/database';

export type SecurityEventType =
  | 'FAILED_LOGIN'
  | 'TOKEN_ABUSE'
  | 'SUSPICIOUS_ACTIVITY'
  | 'CHEAT_ATTEMPT'
  | 'RATE_LIMIT_VIOLATION'
  | 'SESSION_REVOKED'
  | 'CONCURRENT_SESSION_LIMIT'
  | 'INVALID_REFRESH_TOKEN'
  | 'REPLAY_ATTACK'
  | 'INVALID_DICE_SYNC';

export type SecuritySeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface SecurityEventInput {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export class SecurityService {
  constructor(private prisma: PrismaClient) {}

  async log(input: SecurityEventInput): Promise<void> {
    await this.prisma.securityEvent.create({
      data: {
        eventType: input.eventType,
        severity: input.severity ?? 'INFO',
        userId: input.userId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        details: (input.details ?? {}) as any,
      },
    });
  }

  async getEvents(params: {
    offset?: number;
    limit?: number;
    eventType?: string;
    severity?: string;
    userId?: string;
  }): Promise<{ events: any[]; total: number }> {
    const offset = Math.max(0, params.offset ?? 0);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const where: Record<string, unknown> = {};
    if (params.eventType) where.eventType = params.eventType;
    if (params.severity) where.severity = params.severity;
    if (params.userId) where.userId = params.userId;

    const [events, total] = await Promise.all([
      this.prisma.securityEvent.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.securityEvent.count({ where: where as any }),
    ]);

    return {
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        severity: e.severity,
        userId: e.userId,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
        details: e.details,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
    };
  }

  async countByType(eventType: string, since: Date): Promise<number> {
    return this.prisma.securityEvent.count({
      where: { eventType, createdAt: { gte: since } },
    });
  }

  async countByUser(userId: string, eventType: string, since: Date): Promise<number> {
    return this.prisma.securityEvent.count({
      where: { userId, eventType, createdAt: { gte: since } },
    });
  }

  async getSummary(): Promise<{
    failedLogins24h: number;
    tokenAbuse24h: number;
    cheatAttempts24h: number;
    rateLimitViolations24h: number;
    totalEvents24h: number;
  }> {
    const since = new Date(Date.now() - 86400000);
    const [failedLogins24h, tokenAbuse24h, cheatAttempts24h, rateLimitViolations24h, totalEvents24h] = await Promise.all([
      this.countByType('FAILED_LOGIN', since),
      this.countByType('TOKEN_ABUSE', since),
      this.countByType('CHEAT_ATTEMPT', since),
      this.countByType('RATE_LIMIT_VIOLATION', since),
      this.prisma.securityEvent.count({ where: { createdAt: { gte: since } } }),
    ]);
    return { failedLogins24h, tokenAbuse24h, cheatAttempts24h, rateLimitViolations24h, totalEvents24h };
  }
}