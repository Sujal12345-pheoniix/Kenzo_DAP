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
      this.logger.info(`Loaded ${flows.length} published experience(s)`);

      // Progress is preserved per user/session based on targeting & frequency rules
      // Register session heartbeat with server
      this.sendHeartbeat();

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

      // Auto-trigger matching flow & perform background DOM intelligence scan
      void this.triggerMatchingFlow();
      void this.performPageScan();

      // Listen for navigation changes to trigger matching flows and page scans
      this.navigationUnsubscribe = this.navigationWatcher.onNavigate(() => {
        void this.triggerMatchingFlow();
        void this.performPageScan();
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
      if (flows.length === 0) {
        this.logger.info('No published flows found for this project.');
        return;
      }

      // Check for explicit flow ID parameter in URL (?kenzo_flow=<id>)
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const targetFlowId = urlParams?.get('kenzo_flow');

      if (targetFlowId) {
        const explicitFlow = flows.find(f => f.id === targetFlowId);
        if (explicitFlow) {
          this.logger.info(`Starting explicit flow from URL param: ${explicitFlow.name}`);
          this.progressManager.reset(explicitFlow.id);
          await this.flowRunner.start(explicitFlow);
          return;
        }
      }

      let flowToStart = null;
      for (const flow of flows) {
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
          flowToStart = flow;
          break;
        }
      }

      // Fallback: If no flow matched strict URL pattern, start the top published flow
      if (!flowToStart && flows.length > 0) {
        flowToStart = flows[0];
      }

      if (flowToStart) {
        this.logger.info(`Auto-starting flow: ${flowToStart.name} (${flowToStart.id})`);
        await this.flowRunner.start(flowToStart);
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

  private sendHeartbeat(): void {
    if (typeof window === 'undefined') return;
    const config = this.config.get();
    const endpoint = `${config.apiBaseUrl}/sdk/heartbeat`;
    const payload = {
      apiKey: config.apiKey,
      url: window.location.href,
      domain: window.location.hostname,
      userAgent: navigator.userAgent,
      sdkVersion: '1.0.0',
      environment: config.userTraits?.environment || 'production'
    };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Non-blocking heartbeat
    });
  }

  private async performPageScan(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const { PageAnalyzer } = await import('@/dom/page-analyzer');
      const analyzer = new PageAnalyzer();
      const pageModel = analyzer.analyze(window.location.href);

      const config = this.config.get();
      const endpoint = `${config.apiBaseUrl}/sdk/pages/scan`;

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          pageModel,
        }),
      }).catch(() => {});
    } catch (_) {}
  }
}


