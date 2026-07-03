import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('getEnv', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('validates and returns env with defaults', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/db');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('JWT_REFRESH_SECRET', 'refresh-secret');

    const { getEnv } = await import('./env');
    const env = getEnv();

    expect(env.DATABASE_URL).toBe('postgres://localhost:5432/db');
    expect(env.HTTP_PORT).toBe(3001);
    expect(env.WS_PORT).toBe(3002);
    expect(env.CORS_ORIGIN).toBe('http://localhost:3000');
    expect(env.RATE_LIMIT_MAX).toBe(100);
    expect(env.NODE_ENV).toBe('test');
  });

  it('coerces port strings to numbers', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/db');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('JWT_REFRESH_SECRET', 'refresh-secret');
    vi.stubEnv('HTTP_PORT', '4000');

    const { getEnv } = await import('./env');
    const env = getEnv();
    expect(env.HTTP_PORT).toBe(4000);
  });

  it('exits on invalid env', async () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('JWT_REFRESH_SECRET', '');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { getEnv } = await import('./env');
    getEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('rejects non-postgres database URLs', async () => {
    vi.stubEnv('DATABASE_URL', 'mysql://localhost:3306/db');
    vi.stubEnv('JWT_SECRET', 'secret');
    vi.stubEnv('JWT_REFRESH_SECRET', 'refresh-secret');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { getEnv } = await import('./env');
    getEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
