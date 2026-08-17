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
  private activeReopenButtons: Map<string, HTMLElement> = new Map();
  private activeOverlay: HTMLElement | null = null;

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

      /* Top-middle reopen trigger button */
      .kenzo-popup-reopen-btn {
        position: fixed;
        top: 18px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 20px;
        padding: 6px 16px;
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 0 12px rgba(99, 102, 241, 0.25);
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 2147483400;
        backdrop-filter: blur(12px);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        animation: kenzo-reopen-fade 0.3s ease-out;
      }
      .kenzo-popup-reopen-btn:hover {
        transform: translateX(-50%) translateY(-1px) scale(1.04);
        border-color: rgba(129, 140, 248, 0.7);
        color: #ffffff;
        box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
      }
      .kenzo-popup-reopen-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #38bdf8;
        box-shadow: 0 0 8px #38bdf8;
        animation: kenzo-dot-pulse 1.8s infinite;
      }

      @keyframes kenzo-reopen-fade {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes kenzo-dot-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
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

  showPopup(popup: PopupItem, onPrimary?: () => void, onDismiss?: () => void, forceOpen = false): void {
    if (typeof document === 'undefined' || !this.shadowRoot) return;

    const storageKey = `kenzo_popup_dismissed_${popup.id}`;
    const alreadyDismissed = !forceOpen && typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === 'true';

    if (alreadyDismissed) {
      // If already dismissed, don't show the intrusive full-screen modal automatically.
      // Instead, show the top-middle reopen button so the user can easily re-access it!
      this.renderReopenButton(popup, onPrimary, onDismiss);
      return;
    }

    this.renderModalOverlay(popup, onPrimary, onDismiss);
  }

  private renderReopenButton(popup: PopupItem, onPrimary?: () => void, onDismiss?: () => void): void {
    if (!this.shadowRoot) return;
    if (this.activeReopenButtons.has(popup.id)) return;

    const reopenBtn = document.createElement('button');
    reopenBtn.className = 'kenzo-popup-reopen-btn';
    reopenBtn.innerHTML = `
      <span class="kenzo-popup-reopen-dot"></span>
      <span>📢 ${popup.title || 'Announcement'}</span>
    `;

    reopenBtn.addEventListener('click', () => {
      this.renderModalOverlay(popup, onPrimary, onDismiss);
    });

    this.shadowRoot.appendChild(reopenBtn);
    this.activeReopenButtons.set(popup.id, reopenBtn);
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

      // Mark as dismissed in localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`kenzo_popup_dismissed_${popup.id}`, 'true');
      }

      // Render top-middle reopen button so user can re-open at will
      this.renderReopenButton(popup, onPrimary, onDismiss);
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
    this.activeReopenButtons.forEach(btn => btn.remove());
    this.activeReopenButtons.clear();
  }
}
