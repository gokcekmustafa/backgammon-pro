import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage } from './types';
import { createServerMessage } from './types';
import { ConnectionManager } from './connection-manager';
import { RoomManager } from './room-manager';
import { TableManager } from './table-manager';
import { GameSessionManager } from './game-session-manager';
import { EventDispatcher } from './event-dispatcher';
import { ChatManager } from './chat-manager';
import { registerAuthRoutes } from './auth/routes';
import { registerRoomRoutes } from './api/room-routes';
import { registerTableRoutes } from './api/table-routes';
import { registerStatsRoutes } from './api/stats-routes';
import { registerHealthCheck } from './api/health';
import { registerErrorHandler } from './lib/error-handler';
import { StatsService } from './stats-service';
import { verifyAccessToken } from './lib/jwt';
import { getEnv } from './lib/env';
import prisma from './lib/prisma';

const env = getEnv();

const isProduction = env.NODE_ENV === 'production';

const app = Fastify({
  logger: { level: env.LOG_LEVEL },
  trustProxy: isProduction,
});

async function start(): Promise<void> {
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(helmet, {
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", env.CORS_ORIGIN],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false,
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
  });

  registerErrorHandler(app);

  const connections = new ConnectionManager();
  const rooms = new RoomManager(connections);
  const tables = new TableManager(connections);
  const statsService = new StatsService(prisma);
  const gameSessions = new GameSessionManager(
    connections,
    (tableId, p1UserId, p2UserId, winner) => {
      statsService.onGameComplete(p1UserId, p2UserId, winner);
    },
  );
  const chat = new ChatManager(connections, rooms, tables);
  const dispatcher = new EventDispatcher(connections, rooms, tables, chat, gameSessions);

  dispatcher.registerRoomHandlers();
  dispatcher.registerTableHandlers();
  dispatcher.registerChatHandlers();
  dispatcher.registerGameHandlers();

  dispatcher.on('AUTHENTICATE', (connectionId, payload) => {
    const token = payload?.token as string | undefined;
    if (!token) {
      const conn = connections.get(connectionId);
      if (conn) {
        conn.send(createServerMessage('ERROR', { message: 'AUTHENTICATE requires token' }));
      }
      return;
    }
    try {
      const tokenPayload = verifyAccessToken(token);
      connections.bindUser(connectionId, tokenPayload.sub);
      const conn = connections.get(connectionId);
      if (conn) {
        conn.send(createServerMessage('AUTHENTICATED', { userId: tokenPayload.sub }));
      }
    } catch {
      const conn = connections.get(connectionId);
      if (conn) {
        conn.send(createServerMessage('ERROR', { message: 'Invalid or expired token' }));
      }
    }
  });

  registerAuthRoutes(app, prisma);
  registerRoomRoutes(app, prisma);
  registerStatsRoutes(app, prisma);

  registerTableRoutes(
    app,
    prisma,
    (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        connections.broadcastTo(
          room.connectionIds,
          createServerMessage('TABLE_UPDATE', { roomId, refresh: true }),
        );
      }
    },
    (tableId: string, p1UserId: string, p2UserId: string) => {
      gameSessions.createSession(tableId, p1UserId, p2UserId);
    },
  );

  function onMessage(connectionId: string, raw: string): void {
    try {
      const message: ClientMessage = JSON.parse(raw);
      dispatcher.dispatch(connectionId, message);
    } catch {
      const conn = connections.get(connectionId);
      if (conn) {
        conn.send(createServerMessage('ERROR', { message: 'Invalid JSON' }));
      }
    }
  }

  function onClose(connectionId: string): void {
    dispatcher.handleDisconnect(connectionId);
    connections.remove(connectionId);
  }

  const wss = new WebSocketServer({ port: env.WS_PORT });

  wss.on('connection', (socket: WebSocket) => {
    const connection = connections.add(
      (msg) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(msg));
        }
      },
      () => {
        socket.close();
      },
    );

    socket.on('message', (data) => {
      const raw = typeof data === 'string' ? data : data.toString();
      onMessage(connection.id, raw);
    });

    socket.on('close', () => {
      onClose(connection.id);
    });

    socket.on('error', () => {
      onClose(connection.id);
    });
  });

  registerHealthCheck(app, prisma, wss);

  await app.listen({ port: env.HTTP_PORT, host: '0.0.0.0' });
  app.log.info(`HTTP server listening on port ${env.HTTP_PORT}`);
  app.log.info(`WebSocket server listening on port ${env.WS_PORT}`);

  const shutdownTimeout = env.SHUTDOWN_TIMEOUT_MS;

  async function gracefulShutdown(signal: string): Promise<void> {
    app.log.info(`Received ${signal}, starting graceful shutdown`);

    const timeout = setTimeout(() => {
      app.log.error('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, shutdownTimeout);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server shutting down');
      }
    });

    wss.close(() => {
      app.log.info('WebSocket server closed');
    });

    try {
      await app.close();
      app.log.info('HTTP server closed');
    } catch (err) {
      app.log.error(err, 'Error closing HTTP server');
    }

    try {
      await prisma.$disconnect();
      app.log.info('Database connection closed');
    } catch (err) {
      app.log.error(err, 'Error disconnecting database');
    }

    clearTimeout(timeout);
    app.log.info('Graceful shutdown complete');
    process.exit(0);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { app, prisma };
export { ConnectionManager } from './connection-manager';
export { RoomManager } from './room-manager';
export { TableManager } from './table-manager';
export { GameSessionManager } from './game-session-manager';
export { EventDispatcher } from './event-dispatcher';
export { ChatManager } from './chat-manager';
export type * from './types';
