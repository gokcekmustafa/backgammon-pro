import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;

    if (statusCode === 500) {
      app.log.error(error);
    }

    // Special handling for JSON parsing errors (Fastify sets statusCode 400 and code 'FST_ERR_CTP_INVALID_JSON')
    if (
      statusCode === 400 &&
      (error.code === 'FST_ERR_CTP_INVALID_JSON' || error.message?.includes('JSON'))
    ) {
      reply.status(400).send({ error: 'Invalid JSON' });
      return;
    }

    reply.status(statusCode).send({
      error: message,
      statusCode,
    });
  });

  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({
      error: 'Route not found',
      statusCode: 404,
    });
  });
}
