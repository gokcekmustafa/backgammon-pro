import { describe, it, expect, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../lib/env', () => ({
  getEnv: () => ({
    HTTP_PORT: 3001,
    WS_PORT: 3002,
    FRONTEND_URL: '*',
    RATE_LIMIT_MAX: 100,
    NODE_ENV: 'test',
  }),
}));

import { registerHealthCheck } from './health';

describe('registerHealthCheck', () => {
  it('registers GET /api/health route', () => {
    const get = vi.fn();
    const app = { get } as unknown as FastifyInstance;
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]) } as any;

    registerHealthCheck(app, prisma);

    expect(get).toHaveBeenCalledWith('/api/health', expect.any(Function));
  });

  it('registers GET /api/health/ready route', () => {
    const get = vi.fn();
    const app = { get } as unknown as FastifyInstance;
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]) } as any;

    registerHealthCheck(app, prisma, { clients: new Set() } as any);

    expect(get).toHaveBeenCalledWith('/api/health/ready', expect.any(Function));
  });
});
