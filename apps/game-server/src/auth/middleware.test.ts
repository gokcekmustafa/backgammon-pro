import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/jwt', () => ({
  verifyAccessToken: vi.fn((token: string) => {
    if (token === 'valid_token') return { sub: 'u1', type: 'user' as const };
    if (token === 'guest_token') return { sub: 'g1', type: 'guest' as const };
    throw new Error('Invalid token');
  }),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

import { authMiddleware } from './middleware';

function mockRequest(authHeader?: string) {
  return {
    headers: {
      authorization: authHeader,
    },
  } as any;
}

function mockReply() {
  let statusCode = 200;
  let responseBody: any = null;
  const methods: Record<string, any> = {};

  methods.status = vi.fn((code: number) => {
    statusCode = code;
    return methods;
  });

  methods.send = vi.fn((body: any) => {
    responseBody = body;
    return methods;
  });

  methods._getStatus = () => statusCode;
  methods._getBody = () => responseBody;

  return methods as any;
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = mockRequest();
    const reply = mockReply();

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
  });

  it('returns 401 when Authorization header is not Bearer', async () => {
    const req = mockRequest('Basic token');
    const reply = mockReply();

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when token is invalid', async () => {
    const req = mockRequest('Bearer bad_token');
    const reply = mockReply();

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('sets request.user for valid user token', async () => {
    const req = mockRequest('Bearer valid_token') as any;
    const reply = mockReply();

    await authMiddleware(req, reply);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('u1');
    expect(req.user.type).toBe('user');
  });

  it('sets request.user for valid guest token', async () => {
    const req = mockRequest('Bearer guest_token') as any;
    const reply = mockReply();

    await authMiddleware(req, reply);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('g1');
    expect(req.user.type).toBe('guest');
  });
});
