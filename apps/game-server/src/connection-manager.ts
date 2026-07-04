import type { Connection, ServerMessage } from './types';
import { createServerMessage } from './types';

let nextId = 1;

function generateId(): string {
  return `conn_${nextId++}`;
}

interface ConnectionMetrics {
  messageCount: number;
  windowStart: number;
}

const WS_RATE_LIMIT = 60;
const WS_RATE_WINDOW_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 60_000;
const IDLE_TIMEOUT_MS = 30 * 60_000;
const BROADCAST_BATCH_MS = 50;

interface BroadcastBatch {
  ids: string[];
  message: ServerMessage;
  timer: ReturnType<typeof setTimeout> | null;
}

export class ConnectionManager {
  private connections = new Map<string, Connection>();
  private userIdByConnectionId = new Map<string, string>();
  private connectionIdByUserId = new Map<string, string>();
  private connectionMetrics = new Map<string, ConnectionMetrics>();
  private lastActivity = new Map<string, number>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private broadcastBatch: BroadcastBatch | null = null;
  private isDestroyed = false;

  constructor() {
    this.startHeartbeat();
    this.startIdleCleanup();
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isDestroyed) return;
      const now = Date.now();
      for (const [id, conn] of this.connections) {
        const last = this.lastActivity.get(id) ?? now;
        if (now - last > HEARTBEAT_TIMEOUT_MS) {
          try { conn.close(); } catch { /* ignore */ }
          this.remove(id);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private startIdleCleanup(): void {
    this.idleTimer = setInterval(() => {
      if (this.isDestroyed) return;
      const now = Date.now();
      for (const [id, conn] of this.connections) {
        const userId = this.userIdByConnectionId.get(id);
        if (userId) continue;
        const last = this.lastActivity.get(id) ?? now;
        if (now - last > IDLE_TIMEOUT_MS) {
          try { conn.send(createServerMessage('DISCONNECTED', { reason: 'idle_timeout' })); } catch { /* ignore */ }
          try { conn.close(); } catch { /* ignore */ }
          this.remove(id);
        }
      }
    }, 60_000);
  }

  add(send: (message: ServerMessage) => void, close: () => void): Connection {
    const id = generateId();
    const connection: Connection = { id, send, close };
    this.connections.set(id, connection);
    this.connectionMetrics.set(id, { messageCount: 0, windowStart: Date.now() });
    this.lastActivity.set(id, Date.now());
    connection.send(createServerMessage('CONNECTED', { connectionId: id }));
    return connection;
  }

  remove(id: string): boolean {
    this.unbindUser(id);
    this.connectionMetrics.delete(id);
    this.lastActivity.delete(id);
    return this.connections.delete(id);
  }

  get(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  has(id: string): boolean {
    return this.connections.has(id);
  }

  getAll(): Connection[] {
    return Array.from(this.connections.values());
  }

  updateActivity(id: string): void {
    this.lastActivity.set(id, Date.now());
  }

  broadcast(message: ServerMessage): void {
    for (const conn of this.connections.values()) {
      conn.send(message);
    }
  }

  broadcastTo(ids: string[], message: ServerMessage): void {
    for (const id of ids) {
      const conn = this.connections.get(id);
      if (conn) conn.send(message);
    }
  }

  broadcastToBatch(ids: string[], getMessage: () => ServerMessage): void {
    if (this.broadcastBatch) {
      clearTimeout(this.broadcastBatch.timer!);
    }
    this.broadcastBatch = { ids, message: null as any, timer: null };
    this.broadcastBatch.timer = setTimeout(() => {
      const batch = this.broadcastBatch;
      if (!batch) return;
      this.broadcastTo(batch.ids, getMessage());
      this.broadcastBatch = null;
    }, BROADCAST_BATCH_MS);
  }

  size(): number {
    return this.connections.size;
  }

  bindUser(connectionId: string, userId: string): void {
    const oldConnectionId = this.connectionIdByUserId.get(userId);
    if (oldConnectionId && oldConnectionId !== connectionId) {
      this.userIdByConnectionId.delete(oldConnectionId);
    }
    this.userIdByConnectionId.set(connectionId, userId);
    this.connectionIdByUserId.set(userId, connectionId);
    this.lastActivity.set(connectionId, Date.now());
  }

  unbindUser(connectionId: string): void {
    const userId = this.userIdByConnectionId.get(connectionId);
    if (userId) {
      this.connectionIdByUserId.delete(userId);
      this.userIdByConnectionId.delete(connectionId);
    }
  }

  getUserId(connectionId: string): string | undefined {
    return this.userIdByConnectionId.get(connectionId);
  }

  getConnectionIdByUserId(userId: string): string | undefined {
    return this.connectionIdByUserId.get(userId);
  }

  isRateLimited(connectionId: string): boolean {
    const metrics = this.connectionMetrics.get(connectionId);
    if (!metrics) return false;
    const now = Date.now();
    if (now - metrics.windowStart > WS_RATE_WINDOW_MS) {
      metrics.messageCount = 0;
      metrics.windowStart = now;
    }
    metrics.messageCount++;
    return metrics.messageCount > WS_RATE_LIMIT;
  }

  isAuthenticated(connectionId: string): boolean {
    return this.userIdByConnectionId.has(connectionId);
  }

  getAuthenticatedCount(): number {
    return this.connectionIdByUserId.size;
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.reset();
  }

  reset(): void {
    this.connections.clear();
    this.userIdByConnectionId.clear();
    this.connectionIdByUserId.clear();
    this.connectionMetrics.clear();
    this.lastActivity.clear();
    nextId = 1;
  }
}