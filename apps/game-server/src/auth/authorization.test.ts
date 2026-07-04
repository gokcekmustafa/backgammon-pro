import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole, requireAnyRole, hasRole } from './authorization';

function mockReply() {
  let statusCode = 200;
  let responseBody: unknown = null;
  const methods: Record<string, unknown> = {};

  methods.status = vi.fn((code: number) => {
    statusCode = code;
    return methods;
  });

  methods.send = vi.fn((body: unknown) => {
    responseBody = body;
    return methods;
  });

  methods._getStatus = () => statusCode;
  methods._getBody = () => responseBody;

  return methods as any;
}

function mockPrisma(user?: { role: string } | null) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(user ?? null),
    },
  } as any;
}

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when request has no user', async () => {
    const prisma = mockPrisma();
    const handler = requireRole(prisma, 'ADMIN');
    const req = {} as any;
    const reply = mockReply();

    await handler(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('returns 403 for guest users', async () => {
    const prisma = mockPrisma();
    const handler = requireRole(prisma, 'ADMIN');
    const req = { user: { id: 'g1', type: 'guest' } } as any;
    const reply = mockReply();

    await handler(req, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Forbidden: guests cannot access this resource' });
  });

  it('returns 403 when user does not have required role', async () => {
    const prisma = mockPrisma({ role: 'USER' });
    const handler = requireRole(prisma, 'ADMIN');
    const req = { user: { id: 'u1', type: 'user' } } as any;
    const reply = mockReply();

    await handler(req, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Forbidden: insufficient permissions' });
  });

  it('returns 403 when user not found in database', async () => {
    const prisma = mockPrisma(null);
    const handler = requireRole(prisma, 'ADMIN');
    const req = { user: { id: 'u1', type: 'user' } } as any;
    const reply = mockReply();

    await handler(req, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('passes when user has the required role', async () => {
    const prisma = mockPrisma({ role: 'ADMIN' });
    const handler = requireRole(prisma, 'ADMIN');
    const req = { user: { id: 'u1', type: 'user' } } as any;
    const reply = mockReply();

    await handler(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('passes when user has one of the required roles', async () => {
    const prisma = mockPrisma({ role: 'SUPER_ADMIN' });
    const handler = requireRole(prisma, 'ADMIN', 'SUPER_ADMIN');
    const req = { user: { id: 'u1', type: 'user' } } as any;
    const reply = mockReply();

    await handler(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });
});

describe('requireAnyRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to requireRole', async () => {
    const prisma = mockPrisma({ role: 'MODERATOR' });
    const handler = requireAnyRole(prisma, 'ADMIN', 'MODERATOR');
    const req = { user: { id: 'u1', type: 'user' } } as any;
    const reply = mockReply();

    await handler(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });
});

describe('hasRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when user has the role', async () => {
    const prisma = mockPrisma({ role: 'ADMIN' });
    const result = await hasRole(prisma, 'u1', 'ADMIN');
    expect(result).toBe(true);
  });

  it('returns false when user has a different role', async () => {
    const prisma = mockPrisma({ role: 'USER' });
    const result = await hasRole(prisma, 'u1', 'ADMIN');
    expect(result).toBe(false);
  });

  it('returns true when user has one of the specified roles', async () => {
    const prisma = mockPrisma({ role: 'MODERATOR' });
    const result = await hasRole(prisma, 'u1', 'ADMIN', 'MODERATOR');
    expect(result).toBe(true);
  });

  it('returns false when user is not found', async () => {
    const prisma = mockPrisma(null);
    const result = await hasRole(prisma, 'nonexistent', 'USER');
    expect(result).toBe(false);
  });
});
