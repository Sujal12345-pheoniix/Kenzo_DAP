/**
 * Smart Tip & Validation Smart Tip Manager.
 * Renders anchored info badges and live input field validators inside Shadow DOM.
 * Features retry polling, multi-selector support, and high-visibility glassmorphic popovers.
 * @module smart-tip/smart-tip-manager
 */

import { resolveFingerprint } from '@/dom/fingerprint';
import type { ElementSelector } from '@/types';

export interface SmartTipItem {
  id: string;
  selector: ElementSelector;
  title?: string;
  content: string;
  type?: 'info' | 'validation' | 'warning';
  validationPattern?: string; // Regex string for live validation
  validationErrorMessage?: string;
}

export class SmartTipManager {
  private activeTips: Map<string, { badge: HTMLElement; card: HTMLElement; cleanup: () => void }> = new Map();
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private pendingPolls: Set<number> = new Set();

  constructor() {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-smart-tip-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-smart-tip-root';
    this.shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483100; pointer-events: none;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .smart-tip-badge {
        position: fixed;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 4px 14px rgba(59, 130, 246, 0.6);
        pointer-events: auto;
        z-index: 2147483100;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        animation: smart-tip-pulse 2.2s infinite;
      }
      .smart-tip-badge:hover {
        transform: scale(1.22);
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 1), 0 6px 20px rgba(59, 130, 246, 0.8);
      }
      @keyframes smart-tip-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 4px 14px rgba(59, 130, 246, 0.5); }
        50% { transform: scale(1.08); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.7), 0 6px 20px rgba(59, 130, 246, 0.8); }
      }
      .smart-tip-badge.validation-error {
        background: #ef4444;
        box-shadow: 0 2px 10px rgba(239, 68, 68, 0.7);
      }
      .smart-tip-card {
        position: fixed;
        background: linear-gradient(145deg, rgba(11, 19, 43, 0.98), rgba(15, 23, 42, 0.98));
        color: #ffffff;
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 14px;
        padding: 14px 18px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.45;
        max-width: 280px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.65), 0 0 20px rgba(99, 102, 241, 0.25);
        display: none;
        pointer-events: auto;
        z-index: 2147483110;
        animation: smart-tip-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .smart-tip-title {
        font-weight: 700;
        font-size: 13px;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .smart-tip-body {
        color: #cbd5e1 !important;
        -webkit-text-fill-color: #cbd5e1 !important;
        font-size: 12px;
      }
      @keyframes smart-tip-pop {
        from { opacity: 0; transform: translateY(6px) scale(0.96); }
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
      const parts = selector.css.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        try {
          const el = document.querySelector(part);
          if (el) return el;
        } catch {
          // ignore selector errors
        }
      }
    }

    return null;
  }

  registerTip(tip: SmartTipItem): void {
    if (typeof document === 'undefined' || !this.shadowRoot) return;

    let retries = 0;
    const maxRetries = 24; // 6s polling window

    const tryMount = () => {
      const element = this.resolveTargetElement(tip.selector);
      if (element) {
        this.mountTipOnElement(element, tip);
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

  private mountTipOnElement(element: Element, tip: SmartTipItem): void {
    if (!this.shadowRoot) return;

    // Remove previous instance if any
    if (this.activeTips.has(tip.id)) {
      this.activeTips.get(tip.id)?.cleanup();
    }

    const badge = document.createElement('div');
    badge.className = 'smart-tip-badge';
    badge.innerHTML = '💡';
    badge.title = tip.title || 'Tip';

    const card = document.createElement('div');
    card.className = 'smart-tip-card';
    card.innerHTML = `
      ${tip.title ? `<div class="smart-tip-title">💡 ${tip.title}</div>` : ''}
      <div class="smart-tip-body">${tip.content}</div>
    `;

    const updatePosition = () => {
      if (!element.isConnected) {
        badge.style.display = 'none';
        card.style.display = 'none';
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        badge.style.display = 'none';
        card.style.display = 'none';
        return;
      }
      badge.style.display = 'flex';
      badge.style.top = `${Math.max(4, rect.top - 8)}px`;
      badge.style.left = `${Math.max(4, rect.right - 10)}px`;

      card.style.top = `${Math.min(window.innerHeight - 140, rect.bottom + 8)}px`;
      card.style.left = `${Math.min(window.innerWidth - 300, Math.max(16, rect.left))}px`;
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    let isCardPinned = false;

    badge.addEventListener('mouseenter', () => { card.style.display = 'block'; });
    badge.addEventListener('mouseleave', () => { if (!isCardPinned) card.style.display = 'none'; });
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      isCardPinned = !isCardPinned;
      card.style.display = isCardPinned ? 'block' : 'none';
    });

    if (tip.type === 'validation' && tip.validationPattern) {
      const inputEl = element as HTMLInputElement;
      const regex = new RegExp(tip.validationPattern);

      const validateInput = () => {
        const value = inputEl.value || '';
        const isValid = regex.test(value);
        if (!isValid && value.length > 0) {
          badge.classList.add('validation-error');
          badge.textContent = '!';
          const bodyEl = card.querySelector('.smart-tip-body');
          if (bodyEl) bodyEl.textContent = tip.validationErrorMessage || 'Invalid format';
        } else {
          badge.classList.remove('validation-error');
          badge.innerHTML = '💡';
          const bodyEl = card.querySelector('.smart-tip-body');
          if (bodyEl) bodyEl.textContent = tip.content;
        }
      };

      inputEl.addEventListener('input', validateInput);
      inputEl.addEventListener('blur', validateInput);
    }

    this.shadowRoot.appendChild(badge);
    this.shadowRoot.appendChild(card);

    const cleanup = () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      badge.remove();
      card.remove();
    };

    this.activeTips.set(tip.id, { badge, card, cleanup });
  }

  clear(): void {
    this.pendingPolls.forEach(t => clearTimeout(t));
    this.pendingPolls.clear();
    this.activeTips.forEach(t => t.cleanup());
    this.activeTips.clear();
  }
}
