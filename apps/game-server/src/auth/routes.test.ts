import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/password', () => ({
  hashPassword: vi.fn((s: string) => Promise.resolve(`hashed_${s}`)),
  comparePassword: vi.fn((pw: string, hash: string) => Promise.resolve(hash === `hashed_${pw}`)),
}));

vi.mock('../lib/jwt', () => ({
  signAccessToken: vi.fn(() => 'access_token'),
  signRefreshToken: vi.fn(() => 'refresh_token'),
  verifyRefreshToken: vi.fn((token: string) => {
    if (token === 'valid_refresh')
      return { sub: 'user_1', sessionId: 'sess_1', type: 'user' as const };
    if (token === 'guest_refresh')
      return { sub: 'guest_1', sessionId: 'sess_2', type: 'guest' as const };
    throw new Error('Invalid token');
  }),
}));

import { loginHandler, guestLoginHandler, refreshHandler, logoutHandler } from './routes';

function mockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: vi.fn(),
    },
    guestUser: {
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    ...overrides,
  } as any;
}

describe('loginHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when email is missing', async () => {
    const prisma = mockPrisma();
    const result = await loginHandler(prisma, { password: 'pw' });
    expect(result.status).toBe(400);
    expect(result.body).toHaveProperty('error');
  });

  it('returns 400 when password is missing', async () => {
    const prisma = mockPrisma();
    const result = await loginHandler(prisma, { email: 'test@test.com' });
    expect(result.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await loginHandler(prisma, { email: 'unknown@test.com', password: 'pw' });
    expect(result.status).toBe(401);
  });

  it('returns 401 when password is wrong', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      passwordHash: 'hashed_wrong',
      username: 'test',
      displayName: 'Test',
    });
    const result = await loginHandler(prisma, { email: 'test@test.com', password: 'correct' });
    expect(result.status).toBe(401);
  });

  it('returns 200 with tokens on success', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      passwordHash: 'hashed_password123',
      username: 'testuser',
      displayName: 'Test User',
    });
    prisma.session.create.mockResolvedValue({ id: 's1' });

    const result = await loginHandler(prisma, { email: 'test@test.com', password: 'password123' });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('accessToken', 'access_token');
    expect(result.body).toHaveProperty('refreshToken', 'refresh_token');
    expect(result.body).toHaveProperty('user');
    expect((result.body as any).user.email).toBe('test@test.com');
  });
});

describe('guestLoginHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a guest and returns tokens', async () => {
    const prisma = mockPrisma();
    prisma.guestUser.create.mockResolvedValue({
      id: 'g1',
      displayName: 'GuestPlayer',
    });
    prisma.session.create.mockResolvedValue({ id: 's1' });

    const result = await guestLoginHandler(prisma, { displayName: 'GuestPlayer' });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('accessToken');
    expect(result.body).toHaveProperty('refreshToken');
    expect((result.body as any).guest.displayName).toBe('GuestPlayer');
  });

  it('uses default name when displayName is empty', async () => {
    const prisma = mockPrisma();
    prisma.guestUser.create.mockResolvedValue({ id: 'g2', displayName: 'Guest' });
    prisma.session.create.mockResolvedValue({ id: 's1' });

    const result = await guestLoginHandler(prisma, { displayName: '  ' });

    expect(result.status).toBe(200);
    expect((result.body as any).guest.displayName).toBe('Guest');
  });

  it('uses default name when displayName is not provided', async () => {
    const prisma = mockPrisma();
    prisma.guestUser.create.mockResolvedValue({ id: 'g3', displayName: 'Guest' });
    prisma.session.create.mockResolvedValue({ id: 's1' });

    const result = await guestLoginHandler(prisma, {});

    expect(result.status).toBe(200);
    expect((result.body as any).guest.displayName).toBe('Guest');
  });
});

describe('refreshHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when refreshToken is missing', async () => {
    const prisma = mockPrisma();
    const result = await refreshHandler(prisma, {});
    expect(result.status).toBe(400);
  });

  it('returns 401 for invalid refresh token', async () => {
    const prisma = mockPrisma();
    const result = await refreshHandler(prisma, { refreshToken: 'bad_token' });
    expect(result.status).toBe(401);
  });

  it('returns 401 when session is not found', async () => {
    const prisma = mockPrisma();
    prisma.session.findFirst.mockResolvedValue(null);
    const result = await refreshHandler(prisma, { refreshToken: 'valid_refresh' });
    expect(result.status).toBe(401);
  });

  it('returns 200 with new tokens on success', async () => {
    const prisma = mockPrisma();
    prisma.session.findFirst.mockResolvedValue({
      id: 'sess_1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    prisma.session.update.mockResolvedValue({});

    const result = await refreshHandler(prisma, { refreshToken: 'valid_refresh' });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('accessToken');
    expect(result.body).toHaveProperty('refreshToken');
  });
});

describe('logoutHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when refreshToken is missing', async () => {
    const prisma = mockPrisma();
    const result = await logoutHandler(prisma, {});
    expect(result.status).toBe(400);
  });

  it('returns 401 for invalid refresh token', async () => {
    const prisma = mockPrisma();
    const result = await logoutHandler(prisma, { refreshToken: 'bad' });
    expect(result.status).toBe(401);
  });

  it('returns 200 on successful logout', async () => {
    const prisma = mockPrisma();
    prisma.session.updateMany.mockResolvedValue({ count: 1 });

    const result = await logoutHandler(prisma, { refreshToken: 'valid_refresh' });

    expect(result.status).toBe(200);
    expect(prisma.session.updateMany).toHaveBeenCalled();
  });
});
