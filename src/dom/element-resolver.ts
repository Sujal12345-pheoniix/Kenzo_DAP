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

  resolveSync(selector: ElementSelector): ResolvedElement | null {
    const element = this.selectorEngine.queryOne(selector);
    if (element) {
      return this.buildResolved(element, selector);
    }

    // Try Self-Healing Engine recovery if primary selector failed
    const { SelfHealingEngine } = require('@/dom/self-healing-engine');
    const healer = new SelfHealingEngine();
    const recovery = healer.attemptRecovery(selector);

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

    return null;
  }

  async resolve(
    selector: ElementSelector,
    options?: { retries?: number; interval?: number },
  ): Promise<ResolvedElement | null> {
    const config = this.config.get();
    const retries = options?.retries ?? config.elementWaitRetries;
    const interval = options?.interval ?? config.elementWaitInterval;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const resolved = this.resolveSync(selector);
      if (resolved?.visible) {
        this.eventBus.emit('dom:element:found', { selector, element: resolved.element });
        return resolved;
      }

      if (attempt < retries) {
        await sleep(interval);
      }
    }

    this.logger.warn('Element not found', { selector });
    this.eventBus.emit('dom:element:not_found', { selector });
    return null;
  }

  async waitForElement(selector: ElementSelector, timeout?: number): Promise<ResolvedElement> {
    const config = this.config.get();
    const maxWait = timeout ?? config.elementWaitRetries * config.elementWaitInterval;
    const interval = config.elementWaitInterval;
    const maxAttempts = Math.ceil(maxWait / interval);

    const resolved = await this.resolve(selector, {
      retries: maxAttempts,
      interval,
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
