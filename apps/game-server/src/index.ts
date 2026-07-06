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
import { CacheService } from './cache-service';
import { registerAuthRoutes } from './auth/routes';
import { registerRoomRoutes } from './api/room-routes';
import { registerTableRoutes } from './api/table-routes';
import { registerStatsRoutes } from './api/stats-routes';
import { registerHealthCheck } from './api/health';
import { registerAdminRoutes } from './api/admin-routes';
import { registerAdminTableGameRoutes } from './api/admin-table-game-routes';
import { registerNotificationRoutes } from './api/notification-routes';
import { registerAdminNotificationRoutes } from './api/admin-notification-routes';
import { registerSubscriptionRoutes } from './api/subscription-routes';
import { registerAdminSubscriptionRoutes } from './api/admin-subscription-routes';
import { registerTournamentRoutes } from './api/tournament-routes';
import { registerAdminTournamentRoutes } from './api/admin-tournament-routes';
import { registerSocialRoutes } from './api/social-routes';
import { registerAdminSocialRoutes } from './api/admin-social-routes';
import { registerProgressionRoutes } from './api/progression-routes';
import { registerAdminProgressionRoutes } from './api/admin-progression-routes';
import { registerSeasonRoutes } from './api/season-routes';
import { registerAdminSeasonRoutes } from './api/admin-season-routes';
import { registerAdminSecurityRoutes } from './api/admin-security-routes';
import { NotificationService } from './notification-service';
import { SubscriptionService } from './subscription-service';
import { TournamentService } from './tournament-service';
import { SocialService } from './social-service';
import { XpService } from './xp-service';
import { AchievementService } from './achievement-service';
import { MissionService } from './mission-service';
import { SeasonService } from './season-service';
import { SecurityService } from './security-service';
import { SessionManager } from './session-manager';
import { RateLimiter } from './rate-limiter';
import { AntiCheatService } from './anti-cheat-service';
import { MonitoringService } from './monitoring-service';
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
  await app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
  await app.register(helmet, {
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", env.FRONTEND_URL],
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

  const cache = new CacheService();
  const connections = new ConnectionManager();
  const rooms = new RoomManager(connections);
  const tables = new TableManager(connections);
  const statsService = new StatsService(prisma);
  const security = new SecurityService(prisma);
  const sessions = new SessionManager(prisma, security, env.CONCURRENT_SESSION_LIMIT);
  const rateLimiter = new RateLimiter(
    connections,
    security,
    env.RATE_LIMIT_MAX,
    env.RATE_LIMIT_PER_USER,
    env.RATE_LIMIT_PER_IP,
  );
  const antiCheat = new AntiCheatService(prisma, connections, security, env.MIN_MOVE_TIME_MS);
  const monitoring = new MonitoringService(
    prisma,
    connections,
    rateLimiter,
    () => gameSessions.getAllSessions().length,
    cache,
  );
  const gameSessions = new GameSessionManager(
    connections,
    async (tableId, p1UserId, p2UserId, winner) => {
      statsService.onGameComplete(p1UserId, p2UserId, winner);
      const winnerUserId = winner === 1 ? p1UserId : winner === 2 ? p2UserId : null;
      const loserUserId = winner === 1 ? p2UserId : winner === 2 ? p1UserId : null;

      if (winnerUserId) {
        const activeSeason = await seasons.getActiveSeason();
        const seasonId = activeSeason?.id;
        await Promise.allSettled([
          xp.awardXp(winnerUserId, 50, 'MATCH_WON'),
          xp.awardXp(loserUserId!, 15, 'MATCH_PLAYED'),
          achievements.checkAndUnlock(winnerUserId, 'game_wins', 1),
          achievements.checkAndUnlock(loserUserId!, 'game_losses', 1),
          missions.updateProgress(winnerUserId, 'game_wins'),
          missions.updateProgress(loserUserId!, 'game_losses'),
          seasonId ? seasons.addSeasonXp(winnerUserId, seasonId, 50) : Promise.resolve(),
          seasonId ? seasons.addSeasonXp(loserUserId!, seasonId, 15) : Promise.resolve(),
        ]);
      } else {
        const activeSeason = await seasons.getActiveSeason();
        const seasonId = activeSeason?.id;
        await Promise.allSettled([
          xp.awardXp(p1UserId, 25, 'MATCH_PLAYED'),
          xp.awardXp(p2UserId, 25, 'MATCH_PLAYED'),
          missions.updateProgress(p1UserId, 'game_draws'),
          missions.updateProgress(p2UserId, 'game_draws'),
          seasonId ? seasons.addSeasonXp(p1UserId, seasonId, 25) : Promise.resolve(),
          seasonId ? seasons.addSeasonXp(p2UserId, seasonId, 25) : Promise.resolve(),
        ]);
      }
    },
  );
  const chat = new ChatManager(connections, rooms, tables);
  const notifications = new NotificationService(prisma, connections);
  const subscriptions = new SubscriptionService(prisma);
  const tournaments = new TournamentService(prisma, connections);
  const social = new SocialService(prisma, connections);
  const xp = new XpService(prisma, connections);
  const achievements = new AchievementService(prisma, connections, xp);
  const missions = new MissionService(prisma, connections, xp);
  const seasons = new SeasonService(prisma, connections, cache);
  gameSessions.setAntiCheat(antiCheat);
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

  registerAuthRoutes(app, prisma, sessions, security);
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
    connections.updateActivity(connectionId);
    try {
      const message: ClientMessage = JSON.parse(raw);
      const start = performance.now();
      dispatcher.dispatch(connectionId, message);
      monitoring.recordResponseTime(performance.now() - start);
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

  registerAdminRoutes(app, prisma);
  registerAdminTableGameRoutes(app, prisma, tables, gameSessions);
  registerNotificationRoutes(app, prisma, notifications);
  registerAdminNotificationRoutes(app, prisma, notifications, connections, rooms, tables);
  registerSubscriptionRoutes(app, prisma, subscriptions);
  registerAdminSubscriptionRoutes(app, prisma, subscriptions);
  registerTournamentRoutes(app, prisma, tournaments);
  registerAdminTournamentRoutes(app, prisma, tournaments);
  registerSocialRoutes(app, prisma, social);
  registerAdminSocialRoutes(app, prisma, social);
  registerProgressionRoutes(app, prisma, xp, achievements, missions);
  registerAdminProgressionRoutes(app, prisma);
  registerSeasonRoutes(app, prisma, seasons);
  registerAdminSeasonRoutes(app, prisma, seasons);
  registerAdminSecurityRoutes(app, prisma, security, sessions, rateLimiter, monitoring);

  await app.listen({ port: env.HTTP_PORT, host: '0.0.0.0' });

  const wss = new WebSocketServer({ server: app.server });
  monitoring.setWsServer(wss);
  registerHealthCheck(app, prisma, wss, monitoring, cache);

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

  app.log.info(`HTTP server listening on port ${env.HTTP_PORT}`);
  app.log.info(`WebSocket server sharing HTTP server`);

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

    connections.destroy();
    cache.destroy();
    monitoring.destroy();

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
export { CacheService } from './cache-service';
export type * from './types';
