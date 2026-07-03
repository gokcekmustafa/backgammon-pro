import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../lib/jwt';

export interface PlayerAuth {
  id: string;
  type: 'user' | 'guest';
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: PlayerAuth;
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);
    (request as AuthenticatedRequest).user = {
      id: payload.sub,
      type: payload.type,
    };
  } catch {
    reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
