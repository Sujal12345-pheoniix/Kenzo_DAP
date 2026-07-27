/**
 * Optimized DOM mutation observer with debounced callbacks.
 * @module dom/mutation-observer
 */

import type { IDomMutationObserver } from '@/core/interfaces';
import { debounce } from '@/utils/debounce';

const DEFAULT_DEBOUNCE_MS = 100;

export class DomMutationObserverService implements IDomMutationObserver {
  private observer: MutationObserver | null = null;
  private running = false;

  start(callback: () => void): void {
    if (this.running) return;

    const debouncedCallback = debounce(callback, DEFAULT_DEBOUNCE_MS);

    this.observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((m) => {
        // Exclude Kenzo-generated UI elements to prevent observer loops
        const target = m.target as HTMLElement;
        if (target && target.closest && (
          target.closest('[data-kenzo-overlay]') ||
          target.closest('#kenzo-backdrop, #kenzo-spotlight, #kenzo-tooltip, #ken-launcher-widget, #kenzo-builder-overlay')
        )) {
          return false;
        }

        return (
          m.type === 'childList' ||
          (m.type === 'attributes' &&
            (m.attributeName === 'class' ||
              m.attributeName === 'style' ||
              m.attributeName === 'hidden'))
        );
      });

      if (relevant) {
        debouncedCallback();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
    });

    this.running = true;
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}
