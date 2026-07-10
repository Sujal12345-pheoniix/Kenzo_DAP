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
    if (!element) return null;

    return this.buildResolved(element, selector);
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
