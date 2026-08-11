/**
 * Launcher Manager — renders custom trigger buttons anchored to DOM elements or fixed positions.
 * @module launcher/launcher-manager
 */

import { resolveFingerprint } from '@/dom/fingerprint';
import type { ElementSelector } from '@/types';

export interface LauncherItem {
  id: string;
  label: string;
  icon?: string;
  selector?: ElementSelector;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  flowId?: string;
  actionUrl?: string;
}

export class LauncherManager {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  constructor() {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-launcher-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-launcher-root';
    this.shadowHost.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147482500;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .kenzo-launcher-btn {
        position: fixed;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: #ffffff;
        border: none;
        border-radius: 20px;
        padding: 8px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 2147482500;
        transition: transform 0.2s ease;
      }
      .kenzo-launcher-btn:hover {
        transform: scale(1.05);
      }
    `;
    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.shadowHost);
  }

  renderLauncher(item: LauncherItem, onTrigger: (launcher: LauncherItem) => void): void {
    if (typeof document === 'undefined' || !this.shadowRoot) return;

    const btn = document.createElement('button');
    btn.className = 'kenzo-launcher-btn';
    btn.innerHTML = `${item.icon ? `<span>${item.icon}</span>` : ''}<span>${item.label}</span>`;

    if (item.selector) {
      let targetEl: Element | null = null;
      if (item.selector.fingerprint) {
        targetEl = resolveFingerprint(item.selector.fingerprint, document).element;
      } else if (item.selector.css) {
        targetEl = document.querySelector(item.selector.css);
      }

      if (targetEl) {
        const updatePos = () => {
          const rect = targetEl!.getBoundingClientRect();
          btn.style.top = `${rect.top}px`;
          btn.style.left = `${rect.right + 8}px`;
        };
        updatePos();
        window.addEventListener('scroll', updatePos, true);
        window.addEventListener('resize', updatePos);
      }
    } else {
      const pos = item.position || 'bottom-right';
      if (pos === 'bottom-right') {
        btn.style.bottom = '24px';
        btn.style.right = '24px';
      } else if (pos === 'bottom-left') {
        btn.style.bottom = '24px';
        btn.style.left = '24px';
      }
    }

    btn.addEventListener('click', () => onTrigger(item));
    this.shadowRoot.appendChild(btn);
  }
}
