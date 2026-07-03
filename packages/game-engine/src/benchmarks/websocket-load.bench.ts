/**
 * WebSocket Load Test Simulation
 * Benchmarks the connection-manager and event-dispatcher under load
 * without requiring a running server.
 */
import { performance } from 'perf_hooks';

// Simulate rate limiter (from connection-manager.ts)
class RateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number = 60, windowMs: number = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  isRateLimited(connectionId: string): boolean {
    const now = Date.now();
    const entry = this.windows.get(connectionId);
    if (!entry || now > entry.resetAt) {
      this.windows.set(connectionId, { count: 1, resetAt: now + this.windowMs });
      return false;
    }
    entry.count += 1;
    return entry.count > this.limit;
  }

  remove(connectionId: string): void {
    this.windows.delete(connectionId);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.windows) {
      if (now > entry.resetAt) this.windows.delete(id);
    }
  }
}

// Simulate auth gate (from event-dispatcher.ts)

function dispatchMessage(type: string, authenticated: boolean): boolean {
  if (!authenticated && type !== 'PING' && type !== 'AUTHENTICATE') {
    return false; // rejected
  }
  return true; // allowed
}

console.log('\n=== WebSocket Load Simulation Benchmarks ===');

// Rate limiter benchmarks
console.log('\n--- Rate Limiter ---');
{
  const rl = new RateLimiter(100, 10000);

  const n = 100000;
  const start = performance.now();
  for (let i = 0; i < n; i++) {
    rl.isRateLimited(`conn-${i % 100}`);
  }
  const elapsed = performance.now() - start;
  console.log(
    `  Rate limit check (100 connections): ${elapsed.toFixed(2)}ms for ${n} = ${Math.round(n / (elapsed / 1000)).toLocaleString()} ops/sec`,
  );

  // Cleanup
  const start2 = performance.now();
  for (let i = 0; i < 100; i++) {
    rl.remove(`conn-${i}`);
  }
  const elapsed2 = performance.now() - start2;
  console.log(`  Rate limit remove (100 connections): ${elapsed2.toFixed(2)}ms`);

  // Many connections
  const rl2 = new RateLimiter(60, 10000);
  const n2 = 1000;
  const start3 = performance.now();
  for (let i = 0; i < n2; i++) {
    for (let j = 0; j < 50; j++) {
      rl2.isRateLimited(`conn-${i}`);
    }
  }
  const elapsed3 = performance.now() - start3;
  console.log(
    `  Rate limit check (1000 conn x 50 msgs): ${elapsed3.toFixed(2)}ms for ${n2 * 50} = ${Math.round((n2 * 50) / (elapsed3 / 1000)).toLocaleString()} ops/sec`,
  );
}

// Auth gate benchmarks
console.log('\n--- Auth Gate ---');
{
  const n = 100000;
  const messages = [
    'PING',
    'AUTHENTICATE',
    'JOIN_ROOM',
    'CHAT_MESSAGE',
    'MAKE_MOVE',
    'CREATE_TABLE',
  ];
  const authed = [false, false, true, true, true, true];

  const start = performance.now();
  for (let i = 0; i < n; i++) {
    dispatchMessage(messages[i % 6], authed[i % 6]);
  }
  const elapsed = performance.now() - start;
  console.log(
    `  Message dispatch: ${elapsed.toFixed(2)}ms for ${n} = ${Math.round(n / (elapsed / 1000)).toLocaleString()} ops/sec`,
  );

  // Unauthenticated flood (should all be rejected)
  const start2 = performance.now();
  let rejected = 0;
  for (let i = 0; i < n; i++) {
    if (!dispatchMessage('MAKE_MOVE', false)) rejected++;
  }
  const elapsed2 = performance.now() - start2;
  console.log(
    `  Rejected unauthenticated: ${elapsed2.toFixed(2)}ms for ${n} = ${Math.round(n / (elapsed2 / 1000)).toLocaleString()} ops/sec (${rejected} blocked)`,
  );
}

// Simulate multiplayer load
console.log('\n--- Multiplayer Simulation ---');
{
  const NUM_CONNECTIONS = 1000;
  const MESSAGES_PER_CONN = 10;
  const rateLimiter = new RateLimiter(60, 10000);
  const connections = new Map<string, boolean>();

  // Simulate 1000 connections
  const start = performance.now();
  for (let i = 0; i < NUM_CONNECTIONS; i++) {
    const connId = `conn-${i}`;
    connections.set(connId, false); // not authenticated yet

    // Authenticate
    if (dispatchMessage('AUTHENTICATE', false)) {
      connections.set(connId, true);
    }
  }
  const elapsed = performance.now() - start;
  console.log(`  ${NUM_CONNECTIONS} connection setup: ${elapsed.toFixed(2)}ms`);

  // Send messages through
  const start2 = performance.now();
  let accepted = 0;
  let rejected = 0;
  let rateLimited = 0;

  for (const [connId, authenticated] of connections) {
    for (let j = 0; j < MESSAGES_PER_CONN; j++) {
      const msgType = ['CHAT_MESSAGE', 'JOIN_ROOM', 'MAKE_MOVE', 'CREATE_TABLE'][j % 4];

      if (!dispatchMessage(msgType, authenticated)) {
        rejected++;
        continue;
      }

      if (rateLimiter.isRateLimited(connId)) {
        rateLimited++;
        continue;
      }

      accepted++;
    }
  }
  const elapsed2 = performance.now() - start2;
  const total = NUM_CONNECTIONS * MESSAGES_PER_CONN;
  console.log(`  ${total} messages (${NUM_CONNECTIONS} conn x ${MESSAGES_PER_CONN} each):`);
  console.log(`    Time: ${elapsed2.toFixed(2)}ms`);
  console.log(`    Accepted: ${accepted}, Rejected: ${rejected}, Rate-limited: ${rateLimited}`);

  // Cleanup all connections
  const start3 = performance.now();
  for (const connId of connections.keys()) {
    rateLimiter.remove(connId);
  }
  connections.clear();
  const elapsed3 = performance.now() - start3;
  console.log(`  Cleanup ${NUM_CONNECTIONS} connections: ${elapsed3.toFixed(2)}ms`);
}
