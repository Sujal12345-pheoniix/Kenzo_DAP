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
import { PopupManager } from '@/popup/popup-manager';
import { SmartTipManager } from '@/smart-tip/smart-tip-manager';
import { BeaconManager } from '@/beacon/beacon-manager';

export class LifecycleManager implements ILifecycleManager {
  private state: SdkState = 'uninitialized';
  private initOptions: KenzoInitOptions | null = null;
  private navigationUnsubscribe: (() => void) | null = null;
  // Track the URL where a flow was last auto-triggered so we trigger once per unique page
  private lastAutoTriggeredPath: string = '';
  // Delay timer for auto-trigger after navigation (lets the new page DOM settle)
  private autoTriggerTimer: ReturnType<typeof setTimeout> | null = null;

  private popupManager: PopupManager;
  private smartTipManager: SmartTipManager;
  private beaconManager: BeaconManager;

  constructor(
    private readonly config: IConfigService,
    private readonly auth: IAuthService,
    private readonly apiClient: import('@/core/interfaces').IApiClient,
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
    this.popupManager = new PopupManager();
    this.smartTipManager = new SmartTipManager();
    this.beaconManager = new BeaconManager();
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

      // CRITICAL FIX: Update ApiClient base URL to the real apiBaseUrl from options.
      // The ApiClient singleton is created before config.init() runs, so it
      // starts with a default URL. We must update it here before any API calls.
      const apiBaseUrl = options.apiBaseUrl || `${window.location.origin}/api/v1`;
      this.apiClient.setBaseUrl(apiBaseUrl);
      // Also set the raw API key so it goes as x-api-key fallback header on every request.
      // This allows the server to authenticate even when the JWT exchange hasn't completed.
      this.apiClient.setApiKey(config.apiKey);
      this.logger.debug('[Kenzo] ApiClient base URL configured', { apiBaseUrl });
      if (config.debug) {
        this.logger.setLevel('debug');
      }

      // Render the floating "Start Guide" launcher widget ("ken") immediately
      this.renderKenLauncher();

      try {
        await this.auth.authenticate(config.apiKey);
        const fullData = await (this.flowLoader as any).loadFullExperiences();
        const flows = (fullData?.flows || []).filter((f: any) => f.status === 'published');
        this.logger.info(`Loaded ${flows.length} published experience(s)`);

        // Render Popups
        if (fullData?.popups && fullData.popups.length > 0) {
          for (const pop of fullData.popups) {
            if (pop.status === 'published' || pop.status === 'active') {
              const item = {
                id: pop.id,
                title: pop.title || pop.name,
                body: pop.content || '',
                primaryButtonLabel: 'Got it',
                triggerType: pop.triggerEvent || 'page_load',
                idleDelayMs: (pop.triggerDelay || 2) * 1000,
              };
              if (item.triggerType === 'page_load') {
                setTimeout(() => this.popupManager.showPopup(item), item.idleDelayMs || 1000);
              } else if (item.triggerType === 'exit_intent') {
                this.popupManager.setupExitIntent(() => this.popupManager.showPopup(item));
              } else if (item.triggerType === 'idle') {
                this.popupManager.setupIdleTrigger(item.idleDelayMs || 4000, () => this.popupManager.showPopup(item));
              }
            }
          }
        }

        // Render Smart Tips
        if (fullData?.smartTips && fullData.smartTips.length > 0) {
          for (const tip of fullData.smartTips) {
            if (tip.selector) {
              const sel = typeof tip.selector === 'string' ? { css: tip.selector } : tip.selector;
              this.smartTipManager.registerTip({
                id: tip.id,
                selector: sel,
                title: tip.name,
                content: tip.content || '',
                type: 'info'
              });
            }
          }
        }

        // Render Beacons
        if (fullData?.beacons && fullData.beacons.length > 0) {
          for (const beacon of fullData.beacons) {
            if (beacon.selector) {
              const sel = typeof beacon.selector === 'string' ? { css: beacon.selector } : beacon.selector;
              this.beaconManager.renderBeacon({
                id: beacon.id,
                selector: sel,
                title: beacon.label || beacon.name,
                flowId: beacon.flowId
              }, (b) => {
                if (b.flowId) {
                  const targetFlow = flows.find((f: any) => f.id === b.flowId);
                  if (targetFlow) this.flowRunner.start(targetFlow);
                }
              });
            }
          }
        }
      } catch (authErr) {
        this.logger.warn('Remote experience sync warning:', { error: String(authErr) });
      }

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
        // Invalidate cached flows so admin changes show up immediately after nav
        this.flowLoader.invalidate();
        // Debounce: wait 700ms for Next.js page DOM to settle before triggering
        if (this.autoTriggerTimer) clearTimeout(this.autoTriggerTimer);
        this.autoTriggerTimer = setTimeout(() => {
          this.autoTriggerTimer = null;
          // Trigger auto-flow on initial page load (use cached flows if available)
        void this.triggerMatchingFlow(false);
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
      // When auto-triggering (ignoreProgress=false), skip flows the user already
      // completed or dismissed so we never replay a finished walkthrough automatically.
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

    // Fallback: only when manually triggered (ignoreProgress=true / Start Guide button).
    // For auto-trigger we intentionally return null if nothing matches the current page
    // — no flow is better than a wrong-page flow firing unexpectedly.
    if (!bestFlow && ignoreProgress && flows.length > 0) {
      // Pick the highest-priority non-URL-restricted flow as a sensible fallback
      const universalFlow = flows.find(f => !f.urlRules || f.urlRules.length === 0);
      bestFlow = universalFlow ?? flows[0];
    }

    return bestFlow;
  }

  private async triggerMatchingFlow(forceRefresh = false): Promise<void> {
    // Don't interrupt a flow that is already running
    if (this.flowRunner.isRunning()) {
      return;
    }

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const targetFlowId = urlParams?.get('kenzo_flow');
    const isForceRun = typeof window !== 'undefined' &&
      (window.location.search.includes('kenzo_force=true') || window.location.search.includes('kenzo_builder=true'));
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

    // Skip if a flow is already running or if auto-trigger already ran for this path
    if (this.flowRunner.isRunning() || (!targetFlowId && !isForceRun && currentPath === this.lastAutoTriggeredPath)) {
      return;
    }

    try {
      // forceRefresh=true after navigation (cache was just invalidated);
      // forceRefresh=false on initial page load (uses the short-TTL cache for speed).
      const flows = await this.flowLoader.loadAll(forceRefresh);
      if (flows.length === 0) {
        this.logger.info('No published flows found for this project.');
        return;
      }

      if (targetFlowId) {
        const explicitFlow = flows.find(f => f.id === targetFlowId);
        if (explicitFlow) {
          this.logger.info(`Starting explicit flow from URL param: ${explicitFlow.name}`);
          this.progressManager.reset(explicitFlow.id);
          this.lastAutoTriggeredPath = currentPath;
          await this.flowRunner.start(explicitFlow);
          return;
        }
      }

      // AUTO-TRIGGER: respect progress (ignoreProgress = false).
      // Walkthroughs fire on the first page visit ONLY per route.
      // Once completed or dismissed, revisiting the page does NOT re-trigger.
      // Users can always manually replay via the "Start Guide" button.
      const flowToStart = this.selectBestMatchingFlow(flows, false);

      if (flowToStart) {
        this.lastAutoTriggeredPath = currentPath;
        this.logger.info(`Auto-starting matching flow: ${flowToStart.name} (${flowToStart.id})`);
        await this.flowRunner.start(flowToStart);
      } else {
        this.logger.info(`No unseen flow matched for path: ${currentPath}`);
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

    // Click handler — Start Guide button triggers the current page's walkthrough
    btn.addEventListener('click', async () => {
      try {
        // Always fetch fresh flows so admin-published guides appear immediately
        const flows = await this.flowLoader.loadAll(true);

        // Find the best flow for the current page/route (ignores prior completion)
        const matchedFlow = this.selectBestMatchingFlow(flows, true);

        if (matchedFlow) {
          if (this.flowRunner.isRunning()) {
            this.flowRunner.stop();
          }
          // Reset progress so the walkthrough plays from Step 1
          this.progressManager.reset(matchedFlow.id);
          // Reset the auto-trigger path guard so the flow can fire again after the button
          this.lastAutoTriggeredPath = '';
          await this.flowRunner.start(matchedFlow);
        } else {
          this.showToast('No guide is available for this page yet.');
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


