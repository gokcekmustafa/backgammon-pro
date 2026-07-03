import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager } from './connection-manager';
import type { ServerMessage } from './types';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
    manager.reset();
  });

  function createMockConnection() {
    const sent: ServerMessage[] = [];
    let closed = false;

    const conn = manager.add(
      (msg) => {
        sent.push(msg);
      },
      () => {
        closed = true;
      },
    );

    return { connection: conn, sent, getClosed: () => closed };
  }

  it('adds a connection and sends CONNECTED', () => {
    const { connection, sent } = createMockConnection();

    expect(connection.id).toMatch(/^conn_\d+$/);
    expect(sent[0].type).toBe('CONNECTED');
    expect(sent[0].payload).toHaveProperty('connectionId', connection.id);
  });

  it('generates unique IDs', () => {
    const c1 = createMockConnection().connection;
    const c2 = createMockConnection().connection;
    expect(c1.id).not.toBe(c2.id);
  });

  it('gets a connection by ID', () => {
    const { connection } = createMockConnection();
    expect(manager.get(connection.id)).toBe(connection);
  });

  it('returns undefined for unknown ID', () => {
    expect(manager.get('unknown')).toBeUndefined();
  });

  it('checks if a connection exists', () => {
    const { connection } = createMockConnection();
    expect(manager.has(connection.id)).toBe(true);
    expect(manager.has('unknown')).toBe(false);
  });

  it('removes a connection', () => {
    const { connection } = createMockConnection();
    expect(manager.remove(connection.id)).toBe(true);
    expect(manager.get(connection.id)).toBeUndefined();
  });

  it('returns false when removing unknown ID', () => {
    expect(manager.remove('unknown')).toBe(false);
  });

  it('returns all connections', () => {
    createMockConnection();
    createMockConnection();
    expect(manager.getAll()).toHaveLength(2);
  });

  it('reports correct size', () => {
    expect(manager.size()).toBe(0);
    createMockConnection();
    expect(manager.size()).toBe(1);
    createMockConnection();
    expect(manager.size()).toBe(2);
  });

  it('broadcasts to all connections', () => {
    const s1 = createMockConnection().sent;
    const s2 = createMockConnection().sent;

    // Clear CONNECTED messages
    s1.length = 0;
    s2.length = 0;

    manager.broadcast({ type: 'PONG', timestamp: 1 });

    expect(s1).toHaveLength(1);
    expect(s1[0].type).toBe('PONG');
    expect(s2).toHaveLength(1);
    expect(s2[0].type).toBe('PONG');
  });

  it('broadcasts to specific IDs', () => {
    const c1 = createMockConnection();
    const c2 = createMockConnection();

    c1.sent.length = 0;
    c2.sent.length = 0;

    manager.broadcastTo([c1.connection.id], { type: 'PONG', timestamp: 1 });

    expect(c1.sent).toHaveLength(1);
    expect(c2.sent).toHaveLength(0);
  });

  // ── Security: WebSocket Rate Limiting ──────────────────────────────

  it('allows up to WS_RATE_LIMIT messages per window', () => {
    const { connection, sent } = createMockConnection();
    sent.length = 0;
    for (let i = 0; i < 60; i++) {
      expect(manager.isRateLimited(connection.id)).toBe(false);
    }
  });

  it('rate limits after exceeding WS_RATE_LIMIT messages in a window', () => {
    const { connection, sent } = createMockConnection();
    sent.length = 0;
    for (let i = 0; i < 60; i++) {
      manager.isRateLimited(connection.id);
    }
    expect(manager.isRateLimited(connection.id)).toBe(true);
  });

  it('resets rate limit window after time passes', () => {
    const { connection, sent } = createMockConnection();
    sent.length = 0;
    for (let i = 0; i < 61; i++) {
      manager.isRateLimited(connection.id);
    }
    expect(manager.isRateLimited(connection.id)).toBe(true);
    // Simulate window reset by calling again after reset
    const metrics = (manager as any).connectionMetrics.get(connection.id);
    metrics.windowStart = 0; // Force window expiration
    expect(manager.isRateLimited(connection.id)).toBe(false);
  });

  // ── Security: Authentication Checks ────────────────────────────────

  it('reports unauthenticated connections correctly', () => {
    const { connection } = createMockConnection();
    expect(manager.isAuthenticated(connection.id)).toBe(false);
  });

  it('reports authenticated connections correctly', () => {
    const { connection } = createMockConnection();
    manager.bindUser(connection.id, 'user1');
    expect(manager.isAuthenticated(connection.id)).toBe(true);
  });

  it('removes rate limit metrics on disconnect', () => {
    const { connection } = createMockConnection();
    manager.isRateLimited(connection.id);
    manager.remove(connection.id);
    expect(manager.isRateLimited(connection.id)).toBe(false);
  });
});
