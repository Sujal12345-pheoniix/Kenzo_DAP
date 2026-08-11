/**
 * Pop-up Manager — renders modal/banner dialogs triggered by page load, events, idle time, or exit intent.
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

  constructor() {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-popup-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-popup-root';
    this.shadowHost.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483500;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .kenzo-popup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 10, 18, 0.75);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483500;
        animation: kenzo-popup-fade 0.25s ease-out;
      }
      .kenzo-popup-card {
        background: #181825;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        width: 90%;
        max-width: 440px;
        padding: 24px;
        color: #cdd6f4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      }
      .kenzo-popup-image {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-radius: 10px;
        margin-bottom: 16px;
      }
      .kenzo-popup-title {
        font-size: 20px;
        font-weight: 700;
        color: #f5e0dc;
        margin-bottom: 10px;
      }
      .kenzo-popup-body {
        font-size: 14px;
        line-height: 1.5;
        color: #a6adc8;
        margin-bottom: 20px;
      }
      .kenzo-popup-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .kenzo-popup-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        border: none;
      }
      .kenzo-popup-btn-primary {
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: #fff;
      }
      .kenzo-popup-btn-secondary {
        background: rgba(255,255,255,0.08);
        color: #cdd6f4;
      }
      @keyframes kenzo-popup-fade {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.shadowHost);
  }

  showPopup(popup: PopupItem, onPrimary?: () => void, onDismiss?: () => void): void {
    if (typeof document === 'undefined' || !this.shadowRoot) return;

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
}
