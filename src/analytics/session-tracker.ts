/**
 * Session tracker for analytics correlation.
 * @module analytics/session-tracker
 */

import type { ISessionStorage, ISessionTracker } from '@/core/interfaces';

export class SessionTracker implements ISessionTracker {
  private sessionStart: string;

  constructor(private readonly sessionStorage: ISessionStorage) {
    this.sessionStart = new Date().toISOString();
    this.sessionStorage.getSessionId();
  }

  getSessionId(): string {
    return this.sessionStorage.getSessionId();
  }

  getSessionStart(): string {
    return this.sessionStart;
  }

  renew(): void {
    this.sessionStart = new Date().toISOString();
  }
}
