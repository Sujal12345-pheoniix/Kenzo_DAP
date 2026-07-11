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
  IConditionEvaluator,
  IProgressManager,
} from '@/core/interfaces';
import type { KenzoInitOptions, SdkState } from '@/types';

export class LifecycleManager implements ILifecycleManager {
  private state: SdkState = 'uninitialized';
  private initOptions: KenzoInitOptions | null = null;
  private navigationUnsubscribe: (() => void) | null = null;

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
    private readonly conditionEvaluator: IConditionEvaluator,
    private readonly progressManager: IProgressManager,
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
      const flows = await this.flowLoader.loadAll();

      // Reset progress for all flows on startup to ensure walkthroughs run on every fresh page load
      for (const flow of flows) {
        this.progressManager.reset(flow.id);
      }

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

      // Auto-trigger matching flow
      void this.triggerMatchingFlow();

      // Listen for navigation changes to trigger matching flows
      this.navigationUnsubscribe = this.navigationWatcher.onNavigate(() => {
        void this.triggerMatchingFlow();
      });
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

    this.navigationUnsubscribe?.();
    this.navigationUnsubscribe = null;

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

  private async triggerMatchingFlow(): Promise<void> {
    if (this.flowRunner.isRunning()) {
      return;
    }

    try {
      const flows = await this.flowLoader.loadAll();
      for (const flow of flows) {
        // Exclude completed or dismissed flows so we don't spam the user every page load
        const progress = this.progressManager.getProgress(flow.id);
        const isForceRun = typeof window !== 'undefined' && 
          (window.location.search.includes('kenzo_force=true') || window.location.search.includes('kenzo_builder=true'));

        if (progress?.completed || progress?.dismissed) {
          if (!isForceRun) {
            continue;
          }
        }

        const urlRules = flow.urlRules || [];
        const matchesUrl = urlRules.length === 0 || this.conditionEvaluator.evaluateUrlRules(urlRules);

        const conditions = flow.conditions || [];
        const matchesConditions = conditions.length === 0 || this.conditionEvaluator.evaluateConditions(conditions);

        if (matchesUrl && matchesConditions) {
          this.logger.info(`Auto-starting matching flow: ${flow.name} (${flow.id})`);
          await this.flowRunner.start(flow);
          break; // Start only the first matching flow
        }
      }
    } catch (error) {
      this.logger.error('Error during auto-triggering matching flow', error as Error);
    }
  }
}
