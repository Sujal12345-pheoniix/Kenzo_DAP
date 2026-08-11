/**
 * Pop-up Manager — renders modal/banner dialogs triggered by page load, events, idle time, or exit intent.
 * Glassmorphic design with subtle glowing border and rich gradient action buttons.
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
        background: rgba(10, 10, 18, 0.78);
        backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483500;
        animation: kenzo-popup-backdrop-fade 0.25s ease-out;
      }
      .kenzo-popup-card {
        background: rgba(24, 24, 37, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        width: 90%;
        max-width: 440px;
        padding: 28px;
        color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(99, 102, 241, 0.2);
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
        color: #ffffff;
        letter-spacing: -0.02em;
        margin-bottom: 10px;
      }
      .kenzo-popup-body {
        font-size: 14px;
        line-height: 1.5;
        color: #cbd5e1;
        margin-bottom: 24px;
      }
      .kenzo-popup-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .kenzo-popup-btn {
        padding: 11px 22px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
      }
      .kenzo-popup-btn-primary {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: #ffffff;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      }
      .kenzo-popup-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
      }
      .kenzo-popup-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
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
