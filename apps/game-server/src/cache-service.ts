interface CacheEntry<T> {
  value: T;
  expiry: number | null;
  hits: number;
  createdAt: number;
}

interface CacheOptions {
  ttlMs?: number;
}

export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private hitCount = 0;
  private missCount = 0;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private defaultTtlMs = 60_000) {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }
    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this.store.delete(key);
      this.missCount++;
      return null;
    }
    entry.hits++;
    this.hitCount++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, opts?: CacheOptions): void {
    const expiry = opts?.ttlMs !== undefined ? Date.now() + opts.ttlMs : this.defaultTtlMs === 0 ? null : Date.now() + this.defaultTtlMs;
    this.store.set(key, { value, expiry, hits: 0, createdAt: Date.now() });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  delPattern(pattern: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    const ratio = total > 0 ? this.hitCount / total : 0;
    return {
      size: this.store.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRatio: Math.round(ratio * 10000) / 10000,
      keys: Array.from(this.store.keys()),
    };
  }

  wrap = <T>(key: string, fn: () => Promise<T>, opts?: CacheOptions): Promise<T> =>
    this.get<T>(key).then((cached) => {
      if (cached !== null) return cached;
      return fn().then((value) => {
        this.set(key, value, opts);
        return value;
      });
    });

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiry !== null && now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}