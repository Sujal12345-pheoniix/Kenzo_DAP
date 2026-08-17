/**
 * Pop-up Manager — renders modal/banner dialogs triggered by page load, events, idle time, or exit intent.
 * Features once-per-page auto-appearance rule with a sleek top-middle reopen trigger button.
 * @module popup/popup-manager
 */

export interface PopupItem {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  triggerType: 'page_load' | 'idle' | 'exit_intent' | 'event';
  idleDelayMs?: number;
}

export class PopupManager {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private exitIntentListener: ((e: MouseEvent) => void) | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private activeOverlay: HTMLElement | null = null;

  constructor() {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-popup-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-popup-root';
    this.shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483500; pointer-events: none;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .kenzo-popup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 10, 18, 0.82);
        backdrop-filter: blur(14px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483500;
        animation: kenzo-popup-backdrop-fade 0.25s ease-out;
      }
      .kenzo-popup-card {
        background: linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(24, 24, 37, 0.98));
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 20px;
        width: 90%;
        max-width: 460px;
        padding: 28px;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.25);
        animation: kenzo-popup-card-scale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }
      .kenzo-popup-image {
        width: calc(100% + 56px);
        margin-left: -28px;
        margin-top: -28px;
        height: 190px;
        object-fit: cover;
        margin-bottom: 20px;
      }
      .kenzo-popup-title {
        font-size: 20px;
        font-weight: 800;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        letter-spacing: -0.02em;
        margin-bottom: 10px;
      }
      .kenzo-popup-body {
        font-size: 14px;
        line-height: 1.55;
        color: #e2e8f0 !important;
        -webkit-text-fill-color: #e2e8f0 !important;
        margin-bottom: 24px;
      }
      .kenzo-popup-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .kenzo-popup-btn {
        padding: 10px 22px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
      }
      .kenzo-popup-btn-primary {
        background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
        color: #ffffff;
        box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
      }
      .kenzo-popup-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(79, 70, 229, 0.6);
      }
      .kenzo-popup-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      .kenzo-popup-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }

      @keyframes kenzo-popup-backdrop-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes kenzo-popup-card-scale {
        from { opacity: 0; transform: scale(0.92) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
    `;
    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.shadowHost);
  }

  /**
   * Evaluates reload counter logic:
   * 1. Appears once while entering the website (visit count = 0 -> 1).
   * 2. If page reloaded more than 2 times (visit count >= 3), popup appears again and cycles.
   * 3. No disturbing top-middle floating buttons.
   */
  showPopup(popup: PopupItem, onPrimary?: () => void, onDismiss?: () => void, forceOpen = false): boolean {
    if (typeof document === 'undefined' || !this.shadowRoot) return false;

    const storageKey = `kenzo_popup_visits_${popup.id}`;
    let count = 0;
    if (typeof localStorage !== 'undefined') {
      count = parseInt(localStorage.getItem(storageKey) || '0', 10);
    }

    if (!forceOpen) {
      if (count === 0) {
        // First time entering website: show popup and record visit count = 1
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, '1');
        }
        this.renderModalOverlay(popup, onPrimary, onDismiss);
        return true;
      } else if (count === 1) {
        // First reload: skip popup, increment count to 2
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, '2');
        }
        return false;
      } else if (count === 2) {
        // Second reload: skip popup, increment count to 3
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, '3');
        }
        return false;
      } else {
        // Reloaded more than 2 times: show popup and reset count back to 1
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, '1');
        }
        this.renderModalOverlay(popup, onPrimary, onDismiss);
        return true;
      }
    }

    this.renderModalOverlay(popup, onPrimary, onDismiss);
    return true;
  }

  private renderModalOverlay(popup: PopupItem, onPrimary?: () => void, onDismiss?: () => void): void {
    if (!this.shadowRoot) return;

    // Remove existing overlay if any
    this.activeOverlay?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'kenzo-popup-overlay';
    overlay.innerHTML = `
      <div class="kenzo-popup-card">
        ${popup.imageUrl ? `<img src="${popup.imageUrl}" class="kenzo-popup-image" alt="Popup header" />` : ''}
        <div class="kenzo-popup-title">${popup.title}</div>
        <div class="kenzo-popup-body">${popup.body}</div>
        <div class="kenzo-popup-actions">
          ${popup.secondaryButtonLabel ? `<button class="kenzo-popup-btn kenzo-popup-btn-secondary">${popup.secondaryButtonLabel}</button>` : ''}
          <button class="kenzo-popup-btn kenzo-popup-btn-primary">${popup.primaryButtonLabel || 'Got it'}</button>
        </div>
      </div>
    `;

    const close = () => {
      overlay.remove();
      this.activeOverlay = null;
    };

    const primaryBtn = overlay.querySelector('.kenzo-popup-btn-primary');
    const secondaryBtn = overlay.querySelector('.kenzo-popup-btn-secondary');

    primaryBtn?.addEventListener('click', () => {
      close();
      onPrimary?.();
    });

    secondaryBtn?.addEventListener('click', () => {
      close();
      onDismiss?.();
    });

    this.shadowRoot.appendChild(overlay);
    this.activeOverlay = overlay;
  }

  setupExitIntent(onTrigger: () => void): void {
    if (typeof window === 'undefined') return;
    this.exitIntentListener = (e: MouseEvent) => {
      if (e.clientY <= 5) {
        onTrigger();
        if (this.exitIntentListener) {
          document.removeEventListener('mouseleave', this.exitIntentListener);
        }
      }
    };
    document.addEventListener('mouseleave', this.exitIntentListener);
  }

  setupIdleTrigger(delayMs: number, onTrigger: () => void): void {
    if (typeof window === 'undefined') return;
    const resetTimer = () => {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(onTrigger, delayMs);
    };

    window.addEventListener('mousemove', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer, { passive: true });
    resetTimer();
  }

  clear(): void {
    this.activeOverlay?.remove();
    this.activeOverlay = null;
  }
}
