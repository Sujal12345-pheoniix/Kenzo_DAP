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

      // Render the floating "Start Guide" launcher widget ("ken")
      this.renderKenLauncher();

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

    if (typeof document !== 'undefined') {
      document.getElementById('ken-launcher-widget')?.remove();
    }

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

  private renderKenLauncher(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Check if the launcher already exists
    const LAUNCHER_ID = 'ken-launcher-widget';
    if (document.getElementById(LAUNCHER_ID)) return;

    // Inject styles for the launcher
    const STYLE_ID = 'ken-launcher-styles';
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        #ken-launcher-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #ffffff;
          border: none;
          border-radius: 30px;
          padding: 12px 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Outfit', 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
          cursor: pointer;
          z-index: 2147482000;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          animation: ken-pulse 2s infinite ease-in-out;
        }

        #ken-launcher-widget:hover {
          transform: scale(1.05);
          background: linear-gradient(135deg, #4f46e5, #4338ca);
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
        }

        #ken-launcher-widget svg {
          animation: ken-spin 4s infinite linear;
        }

        @keyframes ken-pulse {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
            opacity: 0.95;
          }
          50% {
            box-shadow: 0 4px 30px rgba(99, 102, 241, 0.7);
            opacity: 1;
          }
        }

        @keyframes ken-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Create the button element
    const btn = document.createElement('button');
    btn.id = LAUNCHER_ID;
    btn.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l8.982-11.795m-8.982 6.795L21 4.5l-12.018 7.378z"></path>
      </svg>
      Start Guide
    `;

    // Click handler to run matching flow
    btn.addEventListener('click', async () => {
      try {
        const flows = await this.flowLoader.loadAll();
        let matchedFlow = null;
        for (const flow of flows) {
          const urlRules = flow.urlRules || [];
          const matchesUrl = urlRules.length === 0 || this.conditionEvaluator.evaluateUrlRules(urlRules);
          const conditions = flow.conditions || [];
          const matchesConditions = conditions.length === 0 || this.conditionEvaluator.evaluateConditions(conditions);

          if (matchesUrl && matchesConditions) {
            matchedFlow = flow;
            break;
          }
        }

        if (matchedFlow) {
          // If a flow is already running, stop it first
          if (this.flowRunner.isRunning()) {
            this.flowRunner.stop();
          }
          // Force reset the flow progress so it plays from the beginning
          this.progressManager.reset(matchedFlow.id);
          await this.flowRunner.start(matchedFlow);
        } else {
          alert('No onboarding guides available for this page.');
        }
      } catch (err) {
        this.logger.error('Failed to trigger flow via launcher', err as Error);
      }
    });

    document.body.appendChild(btn);
  }
}
