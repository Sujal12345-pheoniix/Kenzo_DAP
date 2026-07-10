/**
 * Local storage wrapper with TTL support and graceful degradation.
 * @module storage/local-storage
 */

import type { IStorageService } from '@/core/interfaces';
import type { ILogger } from '@/core/interfaces';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

const STORAGE_PREFIX = 'kenzo_';

export class LocalStorageService implements IStorageService {
  constructor(private readonly logger: ILogger) {}

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;

      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        this.remove(key);
        return null;
      }

      return entry.value;
    } catch {
      this.logger.warn('Failed to read from localStorage', { key });
      return null;
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const entry: CacheEntry<T> = {
        value,
        expiresAt: ttl ? Date.now() + ttl : null,
      };
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {
      this.logger.warn('Failed to write to localStorage', { key });
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      this.logger.warn('Failed to remove from localStorage', { key });
    }
  }

  clear(prefix?: string): void {
    try {
      const fullPrefix = STORAGE_PREFIX + (prefix ?? '');
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch {
      this.logger.warn('Failed to clear localStorage');
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}
