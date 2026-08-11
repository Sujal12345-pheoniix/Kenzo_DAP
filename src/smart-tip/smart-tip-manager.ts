/**
 * Smart Tip & Validation Smart Tip Manager.
 * Renders anchored info badges and live input field validators inside Shadow DOM.
 * @module smart-tip/smart-tip-manager
 */

import { resolveFingerprint } from '@/dom/fingerprint';
import type { ElementSelector } from '@/types';

export interface SmartTipItem {
  id: string;
  selector: ElementSelector;
  title?: string;
  content: string;
  type: 'info' | 'validation' | 'warning';
  validationPattern?: string; // Regex string for live validation
  validationErrorMessage?: string;
}

export class SmartTipManager {
  private activeTips: Map<string, HTMLElement> = new Map();
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  constructor() {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-smart-tip-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-smart-tip-root';
    this.shadowHost.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483000;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .smart-tip-badge {
        position: fixed;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #6366f1;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        transition: transform 0.2s ease, background 0.2s ease;
      }
      .smart-tip-badge:hover {
        transform: scale(1.15);
        background: #4f46e5;
      }
      .smart-tip-badge.validation-error {
        background: #ef4444;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
      }
      .smart-tip-card {
        position: fixed;
        background: #1e1e2e;
        color: #cdd6f4;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 12px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        max-width: 260px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        display: none;
        z-index: 2147483001;
      }
      .smart-tip-title {
        font-weight: 600;
        color: #cba6f7;
        margin-bottom: 4px;
      }
    `;
    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.shadowHost);
  }

  registerTip(tip: SmartTipItem): void {
    if (typeof document === 'undefined') return;

    let element: Element | null = null;
    if (tip.selector.fingerprint) {
      element = resolveFingerprint(tip.selector.fingerprint, document).element;
    } else if (tip.selector.css) {
      element = document.querySelector(tip.selector.css);
    }

    if (!element) return;

    const badge = document.createElement('div');
    badge.className = 'smart-tip-badge';
    badge.textContent = '?';

    const card = document.createElement('div');
    card.className = 'smart-tip-card';
    card.innerHTML = `
      ${tip.title ? `<div class="smart-tip-title">${tip.title}</div>` : ''}
      <div class="smart-tip-body">${tip.content}</div>
    `;

    const updatePosition = () => {
      const rect = element!.getBoundingClientRect();
      badge.style.top = `${rect.top - 8}px`;
      badge.style.left = `${rect.right - 8}px`;
      card.style.top = `${rect.bottom + 6}px`;
      card.style.left = `${rect.left}px`;
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    badge.addEventListener('mouseenter', () => { card.style.display = 'block'; });
    badge.addEventListener('mouseleave', () => { card.style.display = 'none'; });

    if (tip.type === 'validation' && tip.validationPattern) {
      const inputEl = element as HTMLInputElement;
      const regex = new RegExp(tip.validationPattern);

      const validateInput = () => {
        const value = inputEl.value || '';
        const isValid = regex.test(value);
        if (!isValid && value.length > 0) {
          badge.classList.add('validation-error');
          badge.textContent = '!';
          card.querySelector('.smart-tip-body')!.textContent = tip.validationErrorMessage || 'Invalid format';
        } else {
          badge.classList.remove('validation-error');
          badge.textContent = '?';
          card.querySelector('.smart-tip-body')!.textContent = tip.content;
        }
      };

      inputEl.addEventListener('input', validateInput);
      inputEl.addEventListener('blur', validateInput);
    }

    if (this.shadowRoot) {
      this.shadowRoot.appendChild(badge);
      this.shadowRoot.appendChild(card);
      this.activeTipElementsSet(tip.id, badge);
    }
  }

  private activeTipElementsSet(id: string, badge: HTMLElement): void {
    this.activeTips.set(id, badge);
  }

  clear(): void {
    this.activeTips.clear();
    if (this.shadowRoot) {
      const elements = this.shadowRoot.querySelectorAll('.smart-tip-badge, .smart-tip-card');
      elements.forEach(el => el.remove());
    }
  }
}
