import type { PrismaClient } from '@backgammon/database';
import type { ConnectionManager } from './connection-manager';
import type { RateLimiter } from './rate-limiter';
import type { CacheService } from './cache-service';
import type { WebSocketServer } from 'ws';

interface MetricsSnapshot {
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  connections: {
    activeUsers: number;
    totalConnections: number;
    authenticatedConnections: number;
  };
  games: {
    activeGames: number;
    finishedGamesToday: number;
  };
  rateLimiter: {
    globalCount: number;
    userBuckets: number;
    ipBuckets: number;
  };
  cache: {
    size: number;
    hitRatio: number;
  };
  database: {
    connected: boolean;
    responseTimeMs: number;
  };
  responseTimes: {
    average: number;
    p95: number;
    p99: number;
  };
  eventLoop: {
    lagMs: number;
  };
}

export class MonitoringService {
  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_SAMPLES = 1000;
  private wsServer: WebSocketServer | null = null;
  private eventLoopLag = 0;
  private eventLoopTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaClient,
    private connections: ConnectionManager,
    private rateLimiter: RateLimiter,
    private gameCountProvider: () => number,
    private cache?: CacheService,
  ) {
    this.startEventLoopMonitor();
  }

  setWsServer(ws: WebSocketServer): void {
    this.wsServer = ws;
  }

  private startEventLoopMonitor(): void {
    let last = Date.now();
    this.eventLoopTimer = setInterval(() => {
      const now = Date.now();
      this.eventLoopLag = now - last - 1000;
      last = now;
    }, 1000);
  }

  recordResponseTime(ms: number): void {
    this.responseTimes.push(ms);
    if (this.responseTimes.length > this.MAX_RESPONSE_SAMPLES) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
  }

  private getPercentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  async getMetrics(): Promise<MetricsSnapshot> {
    const dbStart = Date.now();
    let dbConnected = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch { /* ignore */ }
    const dbResponseTime = Date.now() - dbStart;

    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    const sorted = [...this.responseTimes].sort((a, b) => a - b);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [finishedGamesToday] = await Promise.all([
      this.prisma.match.count({
        where: { completedAt: { gte: today } },
      }),
    ]);

    const allConnections = this.connections.getAll();
    const authenticatedCount = allConnections.filter((conn) => {
      return this.connections.getUserId(conn.id) !== undefined;
    }).length;

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
      },
      connections: {
        activeUsers: (this.connections as any).connectionIdByUserId?.size ?? 0,
        totalConnections: this.connections.size(),
        authenticatedConnections: authenticatedCount,
      },
      games: {
        activeGames: this.gameCountProvider(),
        finishedGamesToday,
      },
      rateLimiter: this.rateLimiter.getStats(),
      cache: {
        size: this.cache ? (this.cache as any).getStats().size : 0,
        hitRatio: this.cache ? (this.cache as any).getStats().hitRatio : 0,
      },
      database: {
        connected: dbConnected,
        responseTimeMs: dbResponseTime,
      },
      responseTimes: {
        average: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
        p95: this.getPercentile(sorted, 95),
        p99: this.getPercentile(sorted, 99),
      },
      eventLoop: {
        lagMs: this.eventLoopLag,
      },
    };
  }

  destroy(): void {
    if (this.eventLoopTimer) clearInterval(this.eventLoopTimer);
  }
}