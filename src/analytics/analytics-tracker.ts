/**
 * Analytics event tracker with batching and flush.
 * @module analytics/analytics-tracker
 */

import type {
  IAnalyticsTracker,
  IApiClient,
  IConfigService,
  IEventBus,
  ILogger,
  ISessionTracker,
} from '@/core/interfaces';
import type { AnalyticsEvent, UserIdentity } from '@/types';

const FLUSH_INTERVAL = 5_000;
const MAX_BATCH_SIZE = 20;

export class AnalyticsTracker implements IAnalyticsTracker {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private user: UserIdentity | null = null;

  constructor(
    private readonly apiClient: IApiClient,
    private readonly sessionTracker: ISessionTracker,
    private readonly config: IConfigService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
  ) {}

  track(event: AnalyticsEvent): void {
    if (this.config.isReady() && this.config.get().disableAnalytics) return;

    const enriched: AnalyticsEvent = {
      ...event,
      sessionId: event.sessionId || this.sessionTracker.getSessionId(),
      properties: {
        ...event.properties,
        ...(this.user ? { userId: this.user.userId } : {}),
      },
    };

    this.queue.push(enriched);
    this.eventBus.emit('analytics:event', enriched);

    if (this.queue.length >= MAX_BATCH_SIZE) {
      void this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL);
    }
  }

  trackCustom(
    name: string,
    properties?: Record<string, string | number | boolean>,
  ): void {
    this.track({
      type: 'custom',
      sessionId: this.sessionTracker.getSessionId(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      properties: { eventName: name, ...properties },
    });
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, MAX_BATCH_SIZE);

    try {
      await this.apiClient.post('/analytics/events', { events: batch });
      this.logger.debug('Analytics batch flushed', { count: batch.length });
    } catch (err) {
      this.queue.unshift(...batch);
      this.logger.warn('Failed to flush analytics', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  setUser(identity: UserIdentity): void {
    this.user = identity;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    void this.flush();
  }
}
