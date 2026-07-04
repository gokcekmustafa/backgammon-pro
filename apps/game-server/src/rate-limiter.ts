import type { ConnectionManager } from './connection-manager';
import type { SecurityService } from './security-service';

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private globalBucket: RateLimitBucket = { count: 0, windowStart: Date.now() };
  private userBuckets = new Map<string, RateLimitBucket>();
  private ipBuckets = new Map<string, RateLimitBucket>();

  constructor(
    private connections: ConnectionManager,
    private security: SecurityService,
    private maxGlobal: number,
    private maxPerUser: number,
    private maxPerIp: number,
    private windowMs: number = 60000,
  ) {}

  checkGlobal(): boolean {
    const now = Date.now();
    if (now - this.globalBucket.windowStart > this.windowMs) {
      this.globalBucket = { count: 1, windowStart: now };
      return true;
    }
    this.globalBucket.count++;
    if (this.globalBucket.count > this.maxGlobal) {
      return false;
    }
    return true;
  }

  checkUser(userId: string): boolean {
    const now = Date.now();
    let bucket = this.userBuckets.get(userId);
    if (!bucket || now - bucket.windowStart > this.windowMs) {
      bucket = { count: 1, windowStart: now };
      this.userBuckets.set(userId, bucket);
      return true;
    }
    bucket.count++;
    if (bucket.count > this.maxPerUser) {
      this.security.log({
        eventType: 'RATE_LIMIT_VIOLATION',
        severity: 'WARN',
        userId,
        details: { bucketType: 'user', count: bucket.count, maxPerUser: this.maxPerUser },
      });
      return false;
    }
    return true;
  }

  checkIp(ip: string): boolean {
    const now = Date.now();
    let bucket = this.ipBuckets.get(ip);
    if (!bucket || now - bucket.windowStart > this.windowMs) {
      bucket = { count: 1, windowStart: now };
      this.ipBuckets.set(ip, bucket);
      return true;
    }
    bucket.count++;
    if (bucket.count > this.maxPerIp) {
      this.security.log({
        eventType: 'RATE_LIMIT_VIOLATION',
        severity: 'WARN',
        details: { bucketType: 'ip', ip, count: bucket.count, maxPerIp: this.maxPerIp },
      });
      return false;
    }
    return true;
  }

  checkWebSocket(connectionId: string): boolean {
    return !this.connections.isRateLimited(connectionId);
  }

  getAll(): boolean {
    return this.checkGlobal();
  }

  getStats(): {
    globalCount: number;
    userBuckets: number;
    ipBuckets: number;
  } {
    return {
      globalCount: this.globalBucket.count,
      userBuckets: this.userBuckets.size,
      ipBuckets: this.ipBuckets.size,
    };
  }

  resetUser(userId: string): void {
    this.userBuckets.delete(userId);
  }

  resetIp(ip: string): void {
    this.ipBuckets.delete(ip);
  }

  resetAll(): void {
    this.globalBucket = { count: 0, windowStart: Date.now() };
    this.userBuckets.clear();
    this.ipBuckets.clear();
  }
}