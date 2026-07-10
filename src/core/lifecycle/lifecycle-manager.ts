/**
 * SDK lifecycle manager — coordinates initialization and teardown.
 * @module core/lifecycle
 */

import type {
  IAnalyticsTracker,
  IAuthService,
  IConfigService,
  IEventBus,
  IFlowLoader,
  IFlowRunner,
  ILifecycleManager,
  ILogger,
  INavigationWatcher,
  IOverlayManager,
} from '@/core/interfaces';
import type { KenzoInitOptions, SdkState } from '@/types';

export class LifecycleManager implements ILifecycleManager {
  private state: SdkState = 'uninitialized';
  private initOptions: KenzoInitOptions | null = null;

  constructor(
    private readonly config: IConfigService,
    private readonly auth: IAuthService,
    private readonly flowLoader: IFlowLoader,
    private readonly flowRunner: IFlowRunner,
    private readonly navigationWatcher: INavigationWatcher,
    private readonly overlayManager: IOverlayManager,
    private readonly analytics: IAnalyticsTracker,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
  ) {}

  getState(): SdkState {
    return this.state;
  }

  async initialize(options: KenzoInitOptions): Promise<void> {
    if (this.state === 'ready') {
      this.logger.warn('SDK already initialized');
      return;
    }

    if (this.state === 'initializing') {
      this.logger.warn('SDK initialization already in progress');
      return;
    }

    this.state = 'initializing';
    this.initOptions = options;

    try {
      const config = this.config.init(options);

      if (config.debug) {
        this.logger.setLevel('debug');
      }

      await this.auth.authenticate(config.apiKey);
      await this.flowLoader.loadAll();

      this.navigationWatcher.start();

      this.analytics.track({
        type: 'sdk_initialized',
        sessionId: '',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        properties: { version: '1.0.0' },
      });

      this.state = 'ready';
      this.eventBus.emit('sdk:initialized', undefined);
      this.logger.info('Kenzo SDK initialized successfully');
    } catch (error) {
      this.state = 'error';
      this.logger.error('SDK initialization failed', error as Error);
      throw error;
    }
  }

  destroy(): void {
    if (this.state === 'destroyed' || this.state === 'uninitialized') return;

    this.flowRunner.stop();
    this.navigationWatcher.stop();
    this.overlayManager.destroy();
    this.analytics.destroy();
    this.auth.clear();

    this.state = 'destroyed';
    this.eventBus.emit('sdk:destroyed', undefined);
    this.logger.info('Kenzo SDK destroyed');
  }

  async reload(): Promise<void> {
    const options = this.initOptions;
    this.destroy();
    this.state = 'uninitialized';

    if (options) {
      await this.initialize(options);
    }
  }
}
