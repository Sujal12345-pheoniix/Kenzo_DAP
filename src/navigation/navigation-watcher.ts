/**
 * SPA navigation watcher — intercepts pushState, replaceState, popstate, hashchange.
 * @module navigation/navigation-watcher
 */

import type { IEventBus, INavigationWatcher } from '@/core/interfaces';

export class NavigationWatcher implements INavigationWatcher {
  private callbacks = new Set<(url: string) => void>();
  private currentUrl: string;
  private started = false;
  private originalPushState: History['pushState'] | null = null;
  private originalReplaceState: History['replaceState'] | null = null;
  private boundPopState: (() => void) | null = null;
  private boundHashChange: (() => void) | null = null;

  constructor(private readonly eventBus: IEventBus) {
    this.currentUrl = this.getHref();
  }

  start(): void {
    if (this.started) return;

    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args: Parameters<History['pushState']>) => {
      this.originalPushState!(...args);
      this.onUrlChange();
    };

    history.replaceState = (...args: Parameters<History['replaceState']>) => {
      this.originalReplaceState!(...args);
      this.onUrlChange();
    };

    this.boundPopState = () => this.onUrlChange();
    this.boundHashChange = () => this.onUrlChange();

    window.addEventListener('popstate', this.boundPopState);
    window.addEventListener('hashchange', this.boundHashChange);

    // Next.js App Router & SPA route change observer (watching document title / location changes)
    if (typeof MutationObserver !== 'undefined' && document.querySelector('head title')) {
      const observer = new MutationObserver(() => this.onUrlChange());
      const titleEl = document.querySelector('head title');
      if (titleEl) {
        observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
      }
    }

    // Safety polling for Next.js soft navigation (every 300ms)
    setInterval(() => this.onUrlChange(), 300);

    this.started = true;
  }

  stop(): void {
    if (!this.started) return;

    if (this.originalPushState) {
      history.pushState = this.originalPushState;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }

    if (this.boundPopState) {
      window.removeEventListener('popstate', this.boundPopState);
    }
    if (this.boundHashChange) {
      window.removeEventListener('hashchange', this.boundHashChange);
    }

    this.started = false;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  onNavigate(callback: (url: string) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private onUrlChange(): void {
    const newUrl = this.getHref();
    if (newUrl === this.currentUrl) return;

    this.currentUrl = newUrl;
    this.eventBus.emit('navigation:changed', { url: newUrl });

    for (const callback of this.callbacks) {
      try {
        callback(newUrl);
      } catch {
        // Isolated callback failures
      }
    }
  }

  private getHref(): string {
    return window.location.href;
  }
}
