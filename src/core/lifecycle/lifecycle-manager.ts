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
  // Track the URL where a flow was last auto-triggered so we trigger once per unique page
  private lastAutoTriggeredPath: string = '';
  // Delay timer for auto-trigger after navigation (lets the new page DOM settle)
  private autoTriggerTimer: ReturnType<typeof setTimeout> | null = null;

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
  ) {
    // No sessionFlowEnded blocking — walkthroughs auto-trigger per page visit
  }

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

      // Listen for navigation changes — auto-trigger the best page-specific flow
      this.navigationUnsubscribe = this.navigationWatcher.onNavigate((url) => {
        void this.performPageScan();
        // Reset path tracking so the new page always gets its walkthrough
        this.lastAutoTriggeredPath = '';
        // Stop any currently running flow immediately (before debounce)
        if (this.flowRunner.isRunning()) {
          this.flowRunner.stop();
        }
        // Debounce: wait 700ms for Next.js page DOM to settle before triggering
        if (this.autoTriggerTimer) clearTimeout(this.autoTriggerTimer);
        this.autoTriggerTimer = setTimeout(() => {
          this.autoTriggerTimer = null;
          void this.triggerMatchingFlow();
        }, 700);
        void url; // consumed by watcher
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

  private selectBestMatchingFlow(flows: any[], ignoreProgress = false): any | null {
    if (!flows || flows.length === 0) return null;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isForceRun = typeof window !== 'undefined' && 
      (window.location.search.includes('kenzo_force=true') || window.location.search.includes('kenzo_builder=true'));

    let bestFlow: any | null = null;
    let highestScore = -1;

    for (const flow of flows) {
      if (!ignoreProgress) {
        const progress = this.progressManager.getProgress(flow.id);
        if ((progress?.completed || progress?.dismissed) && !isForceRun) {
          continue;
        }
      }

      const urlRules = flow.urlRules || [];
      const matchesUrl = urlRules.length === 0 || this.conditionEvaluator.evaluateUrlRules(urlRules);
      const conditions = flow.conditions || [];
      const matchesConditions = conditions.length === 0 || this.conditionEvaluator.evaluateConditions(conditions);

      if (matchesUrl && matchesConditions) {
        let score = 1; // Default score for universal match ('/' or '*')
        if (urlRules.length > 0) {
          for (const rule of urlRules) {
            const pat = (rule.pattern || '').trim();
            if (pat && pat !== '/' && pat !== '*') {
              if (rule.type === 'exact' && currentPath === pat) {
                score = Math.max(score, 1000 + pat.length);
              } else if (currentPath === pat) {
                score = Math.max(score, 500 + pat.length);
              } else if (currentPath.startsWith(pat) || currentPath.includes(pat)) {
                score = Math.max(score, 100 + pat.length);
              }
            }
          }
        }
        score += (flow.priority || 0) * 2;

        if (score > highestScore) {
          highestScore = score;
          bestFlow = flow;
        }
      }
    }

    return bestFlow;
  }

  private async triggerMatchingFlow(): Promise<void> {
    // Don't interrupt a flow that is already running
    if (this.flowRunner.isRunning()) {
      return;
    }

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const targetFlowId = urlParams?.get('kenzo_flow');
    const isForceRun = typeof window !== 'undefined' &&
      (window.location.search.includes('kenzo_force=true') || window.location.search.includes('kenzo_builder=true'));
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

    // Skip if we've already auto-triggered for this exact URL (unless forced)
    if (!targetFlowId && !isForceRun && currentPath === this.lastAutoTriggeredPath) {
      return;
    }

    try {
      const flows = await this.flowLoader.loadAll();
      if (flows.length === 0) {
        this.logger.info('No published flows found for this project.');
        return;
      }

      if (targetFlowId) {
        const explicitFlow = flows.find(f => f.id === targetFlowId);
        if (explicitFlow) {
          this.logger.info(`Starting explicit flow from URL param: ${explicitFlow.name}`);
          this.progressManager.reset(explicitFlow.id);
          await this.flowRunner.start(explicitFlow);
          return;
        }
      }

      // ignoreProgress = true: auto-trigger walkthroughs even if user previously
      // dismissed/completed them — each new page navigation shows its tour fresh.
      const flowToStart = this.selectBestMatchingFlow(flows, true);

      if (flowToStart) {
        this.lastAutoTriggeredPath = currentPath; // mark so we don't retrigger on same page
        this.logger.info(`Auto-starting matching flow: ${flowToStart.name} (${flowToStart.id})`);
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
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }

        #ken-launcher-widget:hover {
          transform: scale(1.05);
          background: linear-gradient(135deg, #4f46e5, #4338ca);
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
        }

        #ken-launcher-widget:active {
          transform: scale(0.95);
        }

        #ken-launcher-widget svg {
          animation: ken-spin 4s infinite linear;
          flex-shrink: 0;
        }

        #ken-launcher-widget .ken-label {
          white-space: nowrap;
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

        /* Mobile: Compact circular button */
        @media screen and (max-width: 640px) {
          #ken-launcher-widget {
            bottom: max(16px, env(safe-area-inset-bottom, 16px));
            right: 16px;
            padding: 0;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            justify-content: center;
            gap: 0;
          }
          #ken-launcher-widget .ken-label {
            display: none;
          }
          #ken-launcher-widget svg {
            width: 20px;
            height: 20px;
          }
        }

        /* Small phones */
        @media screen and (max-width: 375px) {
          #ken-launcher-widget {
            width: 48px;
            height: 48px;
            bottom: max(12px, env(safe-area-inset-bottom, 12px));
            right: 12px;
          }
        }

        /* Toast notification */
        @keyframes ken-toast-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ken-toast-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
        #ken-toast-notification {
          position: fixed;
          bottom: 90px;
          right: 16px;
          background: rgba(15, 15, 25, 0.95);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #e8e8f0;
          padding: 12px 20px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 13px;
          font-weight: 500;
          z-index: 2147482001;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          animation: ken-toast-in 250ms ease forwards;
          max-width: calc(100vw - 40px);
        }
        #ken-toast-notification.ken-toast-hiding {
          animation: ken-toast-out 200ms ease forwards;
        }
        @media screen and (max-width: 480px) {
          #ken-toast-notification {
            bottom: 80px;
            left: 16px;
            right: 16px;
            text-align: center;
          }
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
      <span class="ken-label">Start Guide</span>
    `;

    // Click handler to run best matching flow
    btn.addEventListener('click', async () => {
      try {
        const flows = await this.flowLoader.loadAll();
        const matchedFlow = this.selectBestMatchingFlow(flows, true);

        if (matchedFlow) {
          // If a flow is already running, stop it first
          if (this.flowRunner.isRunning()) {
            this.flowRunner.stop();
          }
          // Force reset the flow progress so it plays from the beginning
          this.progressManager.reset(matchedFlow.id);
          await this.flowRunner.start(matchedFlow);
        } else {
          this.showToast('No onboarding guides available for this page.');
        }
      } catch (err) {
        this.logger.error('Failed to trigger flow via launcher', err as Error);
      }
    });

    document.body.appendChild(btn);
  }

  /** Show a temporary toast notification instead of native alert() */
  private showToast(message: string, duration = 3000): void {
    const existing = document.getElementById('ken-toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ken-toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('ken-toast-hiding');
      setTimeout(() => toast.remove(), 200);
    }, duration);
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


