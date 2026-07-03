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

export class ConnectionManager {
  private connections = new Map<string, Connection>();
  private userIdByConnectionId = new Map<string, string>();
  private connectionIdByUserId = new Map<string, string>();
  private connectionMetrics = new Map<string, ConnectionMetrics>();

  add(send: (message: ServerMessage) => void, close: () => void): Connection {
    const id = generateId();
    const connection: Connection = { id, send, close };
    this.connections.set(id, connection);
    this.connectionMetrics.set(id, { messageCount: 0, windowStart: Date.now() });
    connection.send(createServerMessage('CONNECTED', { connectionId: id }));
    return connection;
  }

  remove(id: string): boolean {
    this.unbindUser(id);
    this.connectionMetrics.delete(id);
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

  size(): number {
    return this.connections.size;
  }

  bindUser(connectionId: string, userId: string): void {
    const oldConnectionId = this.connectionIdByUserId.get(userId);
    if (oldConnectionId) {
      this.userIdByConnectionId.delete(oldConnectionId);
    }
    this.userIdByConnectionId.set(connectionId, userId);
    this.connectionIdByUserId.set(userId, connectionId);
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

  reset(): void {
    this.connections.clear();
    this.userIdByConnectionId.clear();
    this.connectionIdByUserId.clear();
    this.connectionMetrics.clear();
    nextId = 1;
  }
}
