/**
 * Element resolver with retry/wait support.
 * @module dom/element-resolver
 */

import type {
  IElementResolver,
  IEventBus,
  ILogger,
  ISelectorEngine,
  IVisibilityChecker,
} from '@/core/interfaces';
import type { IConfigService } from '@/core/interfaces';
import type { ElementSelector, ResolvedElement } from '@/types';
import { sleep } from '@/utils/sleep';

export class ElementResolver implements IElementResolver {
  constructor(
    private readonly selectorEngine: ISelectorEngine,
    private readonly visibilityChecker: IVisibilityChecker,
    private readonly config: IConfigService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
  ) {}

  private healer: any = null;

  resolveSync(selector: ElementSelector): ResolvedElement | null {
    const element = this.selectorEngine.queryOne(selector);
    if (element) {
      return this.buildResolved(element, selector);
    }

    // Lazy instantiate healer once if primary selector failed
    try {
      if (!this.healer) {
        const { SelfHealingEngine } = require('@/dom/self-healing-engine');
        this.healer = new SelfHealingEngine();
      }
      const recovery = this.healer.attemptRecovery(selector);

      if (recovery.recoveredElement && recovery.confidence >= 0.7) {
        this.logger.info(`[Kenzo Self-Healing] Recovered element using ${recovery.strategyUsed}`, {
          original: selector,
          repaired: recovery.repairedSelector,
          confidence: recovery.confidence,
        });

        // Non-blocking repair event report to server
        const config = this.config.get();
        fetch(`${config.apiBaseUrl}/sdk/self-heal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: config.apiKey,
            originalSelector: selector,
            repairedSelector: recovery.repairedSelector,
            confidence: recovery.confidence,
            strategy: recovery.strategyUsed,
            url: window.location.href,
          }),
        }).catch(() => {});

        return this.buildResolved(recovery.recoveredElement, { css: recovery.repairedSelector! });
      }
    } catch (_) {
      // Ignore self-healing errors gracefully
    }

    return null;
  }

  async resolve(
    selector: ElementSelector,
    options?: { retries?: number; interval?: number; maxTimeoutMs?: number },
  ): Promise<ResolvedElement | null> {
    const maxTimeoutMs = options?.maxTimeoutMs ?? (options?.retries && options?.interval ? options.retries * options.interval : 1200);
    const startTime = Date.now();
    const interval = options?.interval ?? 50;

    while (Date.now() - startTime < maxTimeoutMs) {
      const resolved = this.resolveSync(selector);
      if (resolved?.visible) {
        this.eventBus.emit('dom:element:found', { selector, element: resolved.element });
        return resolved;
      }

      await sleep(interval);
    }

    this.logger.warn('Element not found', { selector, elapsedMs: Date.now() - startTime });
    this.eventBus.emit('dom:element:not_found', { selector });
    return null;
  }

  async waitForElement(selector: ElementSelector, timeout?: number): Promise<ResolvedElement> {
    const config = this.config.get();
    const maxWait = timeout ?? config.elementWaitRetries * config.elementWaitInterval;

    const resolved = await this.resolve(selector, {
      maxTimeoutMs: maxWait,
    });

    if (!resolved) {
      throw new Error(`[Kenzo] Element not found within ${maxWait}ms`);
    }

    return resolved;
  }

  private buildResolved(element: Element, selector: ElementSelector): ResolvedElement {
    return {
      element,
      rect: element.getBoundingClientRect(),
      visible: this.visibilityChecker.isVisible(element),
      selector,
    };
  }
}
