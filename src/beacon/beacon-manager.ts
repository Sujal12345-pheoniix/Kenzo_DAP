/**
 * Beacon Manager — renders pulsing hotspot anchors on target DOM elements.
 * Features retry polling, multi-selector fallback, radar animations, and interactive popovers.
 * @module beacon/beacon-manager
 */

import { resolveFingerprint } from '@/dom/fingerprint';
import type { ElementSelector } from '@/types';

export interface BeaconItem {
  id: string;
  selector: ElementSelector;
  title: string;
  description?: string;
  color?: string;
  flowId?: string;
  targetUrl?: string;
}

export class BeaconManager {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private activeBeacons: Map<string, { dot: HTMLElement; cleanup: () => void }> = new Map();
  private pendingPolls: Set<number> = new Set();

  constructor() {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-beacon-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-beacon-root';
    this.shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483000; pointer-events: none;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .kenzo-beacon-container {
        position: fixed;
        width: 24px;
        height: 24px;
        pointer-events: auto;
        cursor: pointer;
        z-index: 2147483000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }
      .kenzo-beacon-container:hover {
        transform: scale(1.2);
      }
      .kenzo-beacon-core {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #38bdf8;
        box-shadow: 0 0 10px #38bdf8, 0 0 20px #0284c7;
        position: relative;
        z-index: 2;
        border: 2px solid #ffffff;
        box-sizing: border-box;
      }
      .kenzo-beacon-ring {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid #38bdf8;
        animation: kenzo-beacon-radar 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
        box-sizing: border-box;
      }
      .kenzo-beacon-ring:nth-child(2) {
        animation-delay: 0.6s;
      }
      @keyframes kenzo-beacon-radar {
        0% {
          transform: scale(0.4);
          opacity: 1;
        }
        100% {
          transform: scale(2.4);
          opacity: 0;
        }
      }
      .kenzo-beacon-popover {
        position: fixed;
        background: linear-gradient(145deg, rgba(11, 19, 43, 0.98), rgba(15, 23, 42, 0.98));
        border: 1px solid rgba(56, 189, 248, 0.4);
        border-radius: 14px;
        padding: 14px 16px;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 12px 35px rgba(0,0,0,0.6), 0 0 20px rgba(56, 189, 248, 0.25);
        max-width: 280px;
        z-index: 2147483010;
        pointer-events: auto;
        animation: kenzo-popover-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .kenzo-beacon-popover-title {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .kenzo-beacon-popover-desc {
        font-size: 12px;
        color: #cbd5e1;
        line-height: 1.4;
        margin-bottom: 10px;
      }
      .kenzo-beacon-popover-action {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: linear-gradient(135deg, #0284c7, #2563eb);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.15s;
      }
      .kenzo-beacon-popover-action:hover {
        transform: translateY(-1px);
      }
      @keyframes kenzo-popover-in {
        from { opacity: 0; transform: translateY(6px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.shadowHost);
  }

  private resolveTargetElement(selector: ElementSelector): Element | null {
    if (typeof document === 'undefined') return null;

    if (selector.fingerprint) {
      const res = resolveFingerprint(selector.fingerprint, document);
      if (res.element) return res.element;
    }

    if (selector.css) {
      // Check if comma-separated list of candidate selectors
      const parts = selector.css.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        try {
          const el = document.querySelector(part);
          if (el) return el;
        } catch {
          // ignore selector syntax errors
        }
      }
    }

    return null;
  }

  renderBeacon(beacon: BeaconItem, onTrigger: (beacon: BeaconItem) => void): void {
    if (typeof document === 'undefined' || !this.shadowRoot) return;

    // Retry polling loop for dynamic SPAs (React/Next.js)
    let retries = 0;
    const maxRetries = 24; // 24 * 250ms = 6s total window

    const tryMount = () => {
      const element = this.resolveTargetElement(beacon.selector);
      if (element) {
        this.mountBeaconOnElement(element, beacon, onTrigger);
        return;
      }

      if (retries < maxRetries) {
        retries++;
        const timerId = window.setTimeout(tryMount, 250);
        this.pendingPolls.add(timerId);
      }
    };

    tryMount();
  }

  private mountBeaconOnElement(element: Element, beacon: BeaconItem, onTrigger: (beacon: BeaconItem) => void): void {
    if (!this.shadowRoot) return;

    // Remove existing if already mounted
    if (this.activeBeacons.has(beacon.id)) {
      this.activeBeacons.get(beacon.id)?.cleanup();
    }

    const container = document.createElement('div');
    container.className = 'kenzo-beacon-container';
    container.title = beacon.title;

    const ring1 = document.createElement('div');
    ring1.className = 'kenzo-beacon-ring';

    const ring2 = document.createElement('div');
    ring2.className = 'kenzo-beacon-ring';

    const core = document.createElement('div');
    core.className = 'kenzo-beacon-core';

    container.appendChild(ring1);
    container.appendChild(ring2);
    container.appendChild(core);

    let popoverEl: HTMLElement | null = null;

    const hidePopover = () => {
      if (popoverEl) {
        popoverEl.remove();
        popoverEl = null;
      }
    };

    const showPopover = () => {
      hidePopover();
      if (!this.shadowRoot) return;

      popoverEl = document.createElement('div');
      popoverEl.className = 'kenzo-beacon-popover';

      const rect = container.getBoundingClientRect();
      popoverEl.style.top = `${Math.min(window.innerHeight - 150, rect.bottom + 8)}px`;
      popoverEl.style.left = `${Math.min(window.innerWidth - 300, Math.max(16, rect.left - 20))}px`;

      popoverEl.innerHTML = `
        <div class="kenzo-beacon-popover-title">✨ ${beacon.title}</div>
        ${beacon.description ? `<div class="kenzo-beacon-popover-desc">${beacon.description}</div>` : ''}
        ${beacon.flowId ? `<button class="kenzo-beacon-popover-action">Start Guided Tour →</button>` : `<button class="kenzo-beacon-popover-action">Got it ✓</button>`}
      `;

      popoverEl.querySelector('.kenzo-beacon-popover-action')?.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePopover();
        onTrigger(beacon);
      });

      this.shadowRoot.appendChild(popoverEl);
    };

    const updatePosition = () => {
      if (!element.isConnected) {
        container.style.display = 'none';
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        container.style.display = 'none';
        return;
      }
      container.style.display = 'flex';
      // Anchor to top-right of element
      container.style.top = `${Math.max(4, rect.top - 8)}px`;
      container.style.left = `${Math.max(4, rect.right - 14)}px`;
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    container.addEventListener('click', (e) => {
      e.stopPropagation();
      if (beacon.flowId) {
        onTrigger(beacon);
      } else {
        if (popoverEl) {
          hidePopover();
        } else {
          showPopover();
        }
      }
    });

    this.shadowRoot.appendChild(container);

    const cleanup = () => {
      hidePopover();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      container.remove();
    };

    this.activeBeacons.set(beacon.id, { dot: container, cleanup });
  }

  clear(): void {
    this.pendingPolls.forEach(t => clearTimeout(t));
    this.pendingPolls.clear();
    this.activeBeacons.forEach(b => b.cleanup());
    this.activeBeacons.clear();
  }
}
