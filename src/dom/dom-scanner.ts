/**
 * DOM Scanner & Semantic Intelligence Engine
 * Coordinates intelligent mutation processing, PII-safe element extraction, and page model analysis.
 * @module dom/dom-scanner
 */

import type { IDomMutationObserver, IDomScanner } from '@/core/interfaces';
import { PageAnalyzer, PageModel } from '@/dom/page-analyzer';

export class DomScanner implements IDomScanner {
  private callbacks = new Set<(model: PageModel) => void>();
  private pageAnalyzer = new PageAnalyzer();
  private cachedModel: PageModel | null = null;
  private isScanning = false;

  constructor(private readonly mutationObserver: IDomMutationObserver) {}

  /**
   * Scans current DOM and returns structured PageModel with PII redaction.
   */
  scan(): PageModel {
    if (this.isScanning && this.cachedModel) {
      return this.cachedModel;
    }

    this.isScanning = true;
    try {
      this.cachedModel = this.pageAnalyzer.analyze(window.location.href);
      for (const callback of this.callbacks) {
        try {
          callback(this.cachedModel);
        } catch (_) {
          // Isolate subscriber errors
        }
      }
    } finally {
      this.isScanning = false;
    }

    return this.cachedModel;
  }

  getLatestPageModel(): PageModel | null {
    return this.cachedModel || (typeof window !== 'undefined' ? this.scan() : null);
  }

  onScan(callback: (model?: PageModel) => void): () => void {
    const wrappedCallback = (m?: PageModel) => callback(m || this.cachedModel || undefined);
    this.callbacks.add(wrappedCallback as any);

    if (!this.mutationObserver.isRunning()) {
      this.mutationObserver.start(() => this.scan());
    }

    return () => {
      this.callbacks.delete(wrappedCallback as any);
      if (this.callbacks.size === 0) {
        this.mutationObserver.stop();
      }
    };
  }
}
