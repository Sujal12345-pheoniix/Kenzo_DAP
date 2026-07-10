/**
 * Kenzo SDK — main facade implementing the public API.
 * @module sdk
 */

import { createContainer } from '@/core/registry';
import { TOKENS } from '@/core/tokens';
import type { Container } from '@/core/container';
import type {
  IAnalyticsTracker,
  IConfigService,
  IErrorBoundary,
  IFlowLoader,
  IFlowRunner,
  ILifecycleManager,
  ILogger,
  IVersionManager,
} from '@/core/interfaces';
import type { KenzoInitOptions, KenzoPublicAPI } from '@/types';
import { BuilderOverlay } from '@/core/builder-overlay';

export class KenzoSDK implements KenzoPublicAPI {
  private container: Container | null = null;
  private initPromise: Promise<void> | null = null;

  async init(options: KenzoInitOptions): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit(options);
    return this.initPromise;
  }

  async startFlow(flowId: string): Promise<void> {
    this.ensureReady();

    const errorBoundary = this.getService<IErrorBoundary>(TOKENS.ErrorBoundary);
    const flowLoader = this.getService<IFlowLoader>(TOKENS.FlowLoader);
    const flowRunner = this.getService<IFlowRunner>(TOKENS.FlowRunner);
    const logger = this.getService<ILogger>(TOKENS.Logger);

    await errorBoundary.wrapAsync(async () => {
      const flow = await flowLoader.loadById(flowId);
      if (!flow) {
        throw new Error(`[Kenzo] Flow not found: ${flowId}`);
      }

      const progress = this.getService<import('@/core/interfaces').IProgressManager>(
        TOKENS.ProgressManager,
      ).getProgress(flowId);

      const startIndex = progress?.currentStepIndex ?? 0;
      await flowRunner.start(flow, startIndex);
      logger.info('Flow started via API', { flowId });
    }, 'startFlow');
  }

  stopFlow(): void {
    if (!this.container) return;
    this.getService<IFlowRunner>(TOKENS.FlowRunner).stop();
  }

  track(eventName: string, properties?: Record<string, string | number | boolean>): void {
    if (!this.container) return;
    this.getService<IAnalyticsTracker>(TOKENS.AnalyticsTracker).trackCustom(
      eventName,
      properties,
    );
  }

  identify(userId: string, traits?: Record<string, string | number | boolean>): void {
    if (!this.container) return;

    const config = this.getService<IConfigService>(TOKENS.Config);
    if (config.isReady()) {
      config.update({ userId, userTraits: traits });
    }

    this.getService<IAnalyticsTracker>(TOKENS.AnalyticsTracker).setUser({
      userId,
      traits: traits ?? {},
    });
  }

  destroy(): void {
    if (!this.container) return;
    this.getService<ILifecycleManager>(TOKENS.LifecycleManager).destroy();
    this.container.clear();
    this.container = null;
    this.initPromise = null;
  }

  async reload(): Promise<void> {
    if (!this.container) {
      throw new Error('[Kenzo] SDK not initialized');
    }
    await this.getService<ILifecycleManager>(TOKENS.LifecycleManager).reload();
  }

  version(): string {
    if (this.container) {
      return this.getService<IVersionManager>(TOKENS.VersionManager).getVersion();
    }
    return '1.0.0';
  }

  private async doInit(options: KenzoInitOptions): Promise<void> {
    this.container = createContainer();

    const config = this.getService<IConfigService>(TOKENS.Config);
    config.init(options);

    const lifecycle = this.getService<ILifecycleManager>(TOKENS.LifecycleManager);
    await lifecycle.initialize(options);

    // Initialize the point-and-click Visual Tour Builder if on browser
    if (typeof window !== 'undefined') {
      const apiBaseUrl = options.apiBaseUrl || 'http://localhost:3000/api/v1';
      new BuilderOverlay(apiBaseUrl, options.apiKey);
    }
  }

  private ensureReady(): void {
    if (!this.container) {
      throw new Error('[Kenzo] SDK not initialized. Call Kenzo.init() first.');
    }

    const lifecycle = this.getService<ILifecycleManager>(TOKENS.LifecycleManager);
    if (lifecycle.getState() !== 'ready') {
      throw new Error('[Kenzo] SDK is not in ready state');
    }
  }

  private getService<T>(token: symbol): T {
    if (!this.container) {
      throw new Error('[Kenzo] SDK not initialized');
    }
    return this.container.resolve<T>(token);
  }
}
