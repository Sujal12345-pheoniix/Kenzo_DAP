/**
 * Beacon Manager — renders pulsing hotspot anchors on target DOM elements.
 * @module beacon/beacon-manager
 */

import { resolveFingerprint } from '@/dom/fingerprint';
import type { ElementSelector } from '@/types';

export interface BeaconItem {
  id: string;
  selector: ElementSelector;
  title: string;
  flowId?: string;
  targetUrl?: string;
}

export class BeaconManager {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private activeBeacons: Map<string, HTMLElement> = new Map();

  constructor() {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-beacon-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-beacon-root';
    this.shadowHost.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483000;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .kenzo-beacon-dot {
        position: fixed;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #10b981;
        cursor: pointer;
        box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
        animation: kenzo-beacon-pulse 1.8s infinite;
        z-index: 2147483000;
      }
      @keyframes kenzo-beacon-pulse {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
    `;
    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.shadowHost);
  }

  renderBeacon(beacon: BeaconItem, onTrigger: (beacon: BeaconItem) => void): void {
    if (typeof document === 'undefined' || !this.shadowRoot) return;

    let element: Element | null = null;
    if (beacon.selector.fingerprint) {
      element = resolveFingerprint(beacon.selector.fingerprint, document).element;
    } else if (beacon.selector.css) {
      element = document.querySelector(beacon.selector.css);
    }

    if (!element) return;

    const dot = document.createElement('div');
    dot.className = 'kenzo-beacon-dot';
    dot.title = beacon.title;

    const updatePosition = () => {
      const rect = element!.getBoundingClientRect();
      dot.style.top = `${rect.top - 5}px`;
      dot.style.left = `${rect.right - 5}px`;
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    dot.addEventListener('click', () => {
      onTrigger(beacon);
    });

    this.shadowRoot.appendChild(dot);
    this.activeBeacons.set(beacon.id, dot);
  }

  clear(): void {
    this.activeBeacons.forEach(dot => dot.remove());
    this.activeBeacons.clear();
  }
}
