/**
 * Session storage wrapper for ephemeral SDK state.
 * @module storage/session-storage
 */

import { v4 as uuidv4 } from 'uuid';

import type { ISessionStorage } from '@/core/interfaces';
import type { ILogger } from '@/core/interfaces';

const SESSION_PREFIX = 'kenzo_sess_';
const SESSION_ID_KEY = 'session_id';

export class SessionStorageService implements ISessionStorage {
  private sessionId: string | null = null;

  constructor(private readonly logger: ILogger) {}

  getSessionId(): string {
    if (this.sessionId) return this.sessionId;

    const stored = this.get<string>(SESSION_ID_KEY);
    if (stored) {
      this.sessionId = stored;
      return stored;
    }

    const newId = uuidv4();
    this.set(SESSION_ID_KEY, newId);
    this.sessionId = newId;
    return newId;
  }

  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(SESSION_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn('Failed to read from sessionStorage', { key });
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(value));
    } catch {
      this.logger.warn('Failed to write to sessionStorage', { key });
    }
  }

  remove(key: string): void {
    try {
      sessionStorage.removeItem(SESSION_PREFIX + key);
    } catch {
      this.logger.warn('Failed to remove from sessionStorage', { key });
    }
  }
}
