/**
 * DOM scanner — coordinates mutation observer for element discovery.
 * @module dom/dom-scanner
 */

import type { IDomMutationObserver, IDomScanner } from '@/core/interfaces';

export class DomScanner implements IDomScanner {
  private callbacks = new Set<() => void>();

  constructor(private readonly mutationObserver: IDomMutationObserver) {}

  scan(): void {
    for (const callback of this.callbacks) {
      try {
        callback();
      } catch {
        // Isolated callback failures
      }
    }
  }

  onScan(callback: () => void): () => void {
    this.callbacks.add(callback);

    if (!this.mutationObserver.isRunning()) {
      this.mutationObserver.start(() => this.scan());
    }

    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.mutationObserver.stop();
      }
    };
  }
}
