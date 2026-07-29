/**
 * Local storage wrapper with TTL support, project isolation scoping, and graceful degradation.
 * @module storage/local-storage
 */

import type { IConfigService, ILogger, IStorageService } from '@/core/interfaces';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

const DEFAULT_PREFIX = 'kenzo_';

export class LocalStorageService implements IStorageService {
  constructor(
    private readonly logger: ILogger,
    private readonly configService?: IConfigService,
  ) {}

  private getPrefix(): string {
    if (this.configService && this.configService.isReady()) {
      const apiKey = this.configService.get().apiKey || '';
      if (apiKey) {
        let hash = 0;
        for (let i = 0; i < apiKey.length; i++) {
          hash = (hash << 5) - hash + apiKey.charCodeAt(i);
          hash |= 0;
        }
        const scope = Math.abs(hash).toString(36);
        return `kenzo_prj_${scope}_`;
      }
    }
    return DEFAULT_PREFIX;
  }

  get<T>(key: string): T | null {
    try {
      const prefix = this.getPrefix();
      const raw = localStorage.getItem(prefix + key);
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
      const prefix = this.getPrefix();
      const entry: CacheEntry<T> = {
        value,
        expiresAt: ttl ? Date.now() + ttl : null,
      };
      localStorage.setItem(prefix + key, JSON.stringify(entry));
    } catch {
      this.logger.warn('Failed to write to localStorage', { key });
    }
  }

  remove(key: string): void {
    try {
      const prefix = this.getPrefix();
      localStorage.removeItem(prefix + key);
    } catch {
      this.logger.warn('Failed to remove from localStorage', { key });
    }
  }

  clear(prefix?: string): void {
    try {
      const fullPrefix = this.getPrefix() + (prefix ?? '');
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
