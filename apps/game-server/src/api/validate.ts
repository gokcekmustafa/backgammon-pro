import type { FastifyRequest, FastifyReply } from 'fastify';

interface ZodSchema {
  safeParse(
    input: unknown,
  ):
    | { success: true; data: unknown }
    | { success: false; error: { issues: Array<{ message: string }> } };
}

export function validateBody(schema: ZodSchema) {
  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Invalid request body';
      reply.status(400).send({ error: message });
      return;
    }
    done();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Invalid query parameters';
      reply.status(400).send({ error: message });
      return;
    }
    done();
  };
}

export function validateParams(schema: ZodSchema) {
  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Invalid parameters';
      reply.status(400).send({ error: message });
      return;
    }
    done();
  };
}
