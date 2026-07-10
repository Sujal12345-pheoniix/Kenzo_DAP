/**
 * In-memory cache with TTL for API responses.
 * @module storage/cache
 */

interface CacheItem<T> {
  data: T;
  expiresAt: number;
  etag?: string;
}

export class MemoryCache {
  private readonly store = new Map<string, CacheItem<unknown>>();

  get<T>(key: string): { data: T; etag?: string } | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return { data: item.data as T, etag: item.etag };
  }

  set<T>(key: string, data: T, ttlMs: number, etag?: string): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      etag,
    });
  }

  invalidate(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}
