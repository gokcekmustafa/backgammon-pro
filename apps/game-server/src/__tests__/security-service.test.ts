import { describe, it, expect, vi } from 'vitest';
import { SecurityService } from '../security-service';

function mockPrisma() {
  return {
    securityEvent: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  } as any;
}

describe('SecurityService', () => {
  it('logs security events', async () => {
    const prisma = mockPrisma();
    const service = new SecurityService(prisma);

    await service.log({
      eventType: 'FAILED_LOGIN',
      severity: 'WARN',
      userId: 'u1',
      ipAddress: '127.0.0.1',
      details: { email: 'test@example.com' },
    });

    expect(prisma.securityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'FAILED_LOGIN',
        severity: 'WARN',
        userId: 'u1',
        ipAddress: '127.0.0.1',
      }),
    });
  });

  it('returns summary counts', async () => {
    const prisma = mockPrisma();
    prisma.securityEvent.count.mockResolvedValue(5);
    const service = new SecurityService(prisma);

    const summary = await service.getSummary();
    expect(summary.failedLogins24h).toBe(5);
    expect(summary.totalEvents24h).toBe(5);
  });

  it('returns paginated events', async () => {
    const prisma = mockPrisma();
    prisma.securityEvent.findMany.mockResolvedValue([
      { id: 'e1', eventType: 'FAILED_LOGIN', severity: 'WARN', userId: 'u1', ipAddress: null, userAgent: null, details: null, createdAt: new Date() },
    ]);
    prisma.securityEvent.count.mockResolvedValue(1);
    const service = new SecurityService(prisma);

    const result = await service.getEvents({ limit: 10 });
    expect(result.events).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('counts events by type since date', async () => {
    const prisma = mockPrisma();
    prisma.securityEvent.count.mockResolvedValue(3);
    const service = new SecurityService(prisma);

    const count = await service.countByType('FAILED_LOGIN', new Date(Date.now() - 86400000));
    expect(count).toBe(3);
  });
});