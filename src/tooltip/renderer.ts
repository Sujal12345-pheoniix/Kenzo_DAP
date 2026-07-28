/**
 * Tooltip renderer — creates accessible, sanitized, beautifully styled tooltip DOM.
 *
 * Key features:
 *  - `position: fixed` with floating-ui-compatible `top:0; left:0` initial placement
 *  - Dark glassmorphism design with indigo/violet gradient header strip
 *  - Accepts both DB button shape `{text, action, style}` and SDK shape `{label, action, primary}`
 *  - Accepts both DB selector shape `{type:'css', value:'…'}` and SDK shape `{css:'…'}`
 *  - `modal` display_mode (or selector targeting `body`) renders as a centred full-screen
 *    modal overlay — no floating-ui positioning needed
 *  - Step progress bar at the bottom
 *  - Smooth CSS keyframe entrance animation
 *  - Arrow pointer element for anchored tooltips
 *  - Kenzo DAP branding badge in footer
 *
 * @module tooltip/renderer
 */

import type {
  IContentSanitizer,
  ITooltipRenderer,
  IZIndexManager,
} from '@/core/interfaces';
import type { StepAction, TooltipRenderOptions } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOOLTIP_ROOT_ID = 'kenzo-tooltip';
const MODAL_BACKDROP_ID = 'kenzo-modal-backdrop';
const STYLES_ID = 'kenzo-tooltip-styles';

// ─── Internal shape helpers ───────────────────────────────────────────────────

/**
 * Raw button as it comes from the database (legacy shape).
 * `style` maps to `primary` when value is `'primary'`.
 */
interface RawDbButton {
  text?: string;
  action?: string;
  style?: string;
  // SDK shape fields allowed too
  label?: string;
  primary?: boolean;
}

interface NormalizedButton {
  label: string;
  action: StepAction;
  primary: boolean;
}

const VALID_ACTIONS = new Set<StepAction>(['next', 'previous', 'skip', 'finish', 'close']);

/** Normalise a button from either DB or SDK shape into a consistent internal form. */
function normalizeButton(raw: RawDbButton): NormalizedButton | null {
  const label = (raw.label ?? raw.text ?? '').trim();
  let rawAction = (raw.action ?? '').trim();

  if (rawAction === 'prev') rawAction = 'previous';

  if (!label || !VALID_ACTIONS.has(rawAction as StepAction)) return null;

  const primary =
    raw.primary === true ||
    (typeof raw.style === 'string' && raw.style.toLowerCase() === 'primary');

  return { label, action: rawAction as StepAction, primary };
}

// ─── Modal detection helpers ──────────────────────────────────────────────────

function isModalMode(options: TooltipRenderOptions): boolean {
  const { step } = options;

  // Explicit display mode
  if (step.displayMode === 'modal') return true;

  // DB selector shape: { type: 'css', value: 'body' }
  const selectorAny = step.selector as unknown as Record<string, string>;
  const selectorValue =
    selectorAny['value'] ??
    step.selector.css ??
    step.selector.xpath ??
    '';

  if (selectorValue.trim() === 'body' && step.placement === 'auto') return true;
  if (selectorValue.trim() === 'body' && !step.placement) return true;

  return false;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
  /* ── Entrance animations ── */
  @keyframes kenzo-fade-in {
    from { opacity: 0; transform: scale(0.94) translateY(6px); }
    to   { opacity: 1; transform: scale(1)    translateY(0px); }
  }
  @keyframes kenzo-modal-in {
    from { opacity: 0; transform: translate(-50%, -48%) scale(0.90); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes kenzo-modal-in-mobile {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes kenzo-backdrop-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── Body scroll lock when modal active ── */
  body.kenzo-scroll-locked {
    overflow: hidden !important;
    position: fixed !important;
    width: 100% !important;
    touch-action: none !important;
  }

  /* ── Modal backdrop ── */
  #${MODAL_BACKDROP_ID} {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.70);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: kenzo-backdrop-in 220ms ease forwards;
    z-index: 2147482999;
    -webkit-tap-highlight-color: transparent;
  }

  /* ── Tooltip root (shared by both tooltip + modal modes) ── */
  #${TOOLTIP_ROOT_ID} {
    --kenzo-radius: 14px;
    --kenzo-header-h: 44px;
    --kenzo-shadow:
      0 0 0 1px rgba(99,102,241,0.25),
      0 12px 32px rgba(0,0,0,0.45);
    --kenzo-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #6366f1 100%);
    --kenzo-glass-bg: rgba(15, 15, 25, 0.95);
    --kenzo-border: rgba(255,255,255,0.12);
    --kenzo-text: #e8e8f0;
    --kenzo-subtext: rgba(210,210,230,0.85);
    --kenzo-btn-ghost-bg: rgba(255,255,255,0.08);
    --kenzo-btn-ghost-hover: rgba(255,255,255,0.15);
    --kenzo-btn-primary-bg: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
    --kenzo-btn-primary-hover: linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%);
    --kenzo-progress-track: rgba(255,255,255,0.12);
    --kenzo-progress-fill: linear-gradient(90deg, #6366f1, #a78bfa);

    position: fixed;
    top: 0;
    left: 0;
    width: 380px;
    max-width: calc(100vw - 24px);
    max-height: min(85vh, 540px);
    display: flex;
    flex-direction: column;
    background: var(--kenzo-glass-bg);
    border: 1px solid var(--kenzo-border);
    border-radius: var(--kenzo-radius);
    box-shadow: var(--kenzo-shadow);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--kenzo-text);
    outline: none;
    overflow: hidden;
    animation: kenzo-fade-in 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    will-change: transform, opacity;
    z-index: 2147483000;
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ── Modal variant ── */
  #${TOOLTIP_ROOT_ID}.kenzo-tooltip--modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-width: calc(100vw - 32px);
    animation: kenzo-modal-in 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  /* ── Gradient header strip ── */
  .kenzo-tooltip__header {
    background: var(--kenzo-gradient);
    padding: 0 16px;
    height: var(--kenzo-header-h);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .kenzo-tooltip__header::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── Step counter pill ── */
  .kenzo-tooltip__step-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.80);
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.20);
    border-radius: 999px;
    padding: 3px 10px;
    line-height: 1;
    position: relative;
    z-index: 1;
  }
  .kenzo-tooltip__step-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.70);
    display: inline-block;
    flex-shrink: 0;
  }

  /* ── Close button ── */
  .kenzo-tooltip__close {
    position: relative;
    z-index: 1;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.85);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 150ms ease, transform 150ms ease;
    flex-shrink: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .kenzo-tooltip__close:hover {
    background: rgba(255,255,255,0.22);
    transform: scale(1.08);
  }
  .kenzo-tooltip__close:active { transform: scale(0.95); }

  /* ── Body ── */
  .kenzo-tooltip__body {
    padding: 20px 20px 0;
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* ── Title ── */
  .kenzo-tooltip__title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.01em;
    line-height: 1.3;
    word-break: break-word;
  }

  /* ── Content ── */
  .kenzo-tooltip__content {
    color: var(--kenzo-subtext);
    font-size: 13.5px;
    line-height: 1.65;
    margin-bottom: 4px;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  .kenzo-tooltip__content p { margin: 0 0 8px; }
  .kenzo-tooltip__content p:last-child { margin-bottom: 0; }
  .kenzo-tooltip__content a { color: #a78bfa; text-decoration: underline; }
  .kenzo-tooltip__content strong { color: var(--kenzo-text); font-weight: 600; }
  .kenzo-tooltip__content code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 4px;
    padding: 1px 5px;
    color: #c4b5fd;
  }

  /* ── Progress bar track ── */
  .kenzo-tooltip__progress-bar-wrap {
    margin: 14px 20px 0;
    height: 3px;
    border-radius: 999px;
    background: var(--kenzo-progress-track);
    overflow: hidden;
    flex-shrink: 0;
  }
  .kenzo-tooltip__progress-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--kenzo-progress-fill);
    transition: width 350ms cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 6px;
  }

  /* ── Button footer ── */
  .kenzo-tooltip__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    padding: 14px 20px 16px;
    flex-shrink: 0;
  }

  /* ── Ghost (secondary) button ── */
  .kenzo-tooltip__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 9px 16px;
    min-height: 38px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: var(--kenzo-btn-ghost-bg);
    color: rgba(200,200,220,0.80);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    line-height: 1;
    transition: background 150ms ease, color 150ms ease, transform 100ms ease;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
  }
  .kenzo-tooltip__btn:hover {
    background: var(--kenzo-btn-ghost-hover);
    color: #fff;
  }
  .kenzo-tooltip__btn:active { transform: scale(0.97); }

  /* ── Primary button ── */
  .kenzo-tooltip__btn--primary {
    background: var(--kenzo-btn-primary-bg);
    border-color: transparent;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 10px rgba(99,102,241,0.40);
  }
  .kenzo-tooltip__btn--primary:hover {
    background: var(--kenzo-btn-primary-hover);
    box-shadow: 0 4px 16px rgba(99,102,241,0.55);
  }

  /* ── Skip link ── */
  .kenzo-tooltip__btn--skip {
    border-color: transparent;
    background: transparent;
    color: var(--kenzo-subtext);
    font-size: 12px;
    padding: 9px 10px;
    min-height: 38px;
    margin-right: auto;
  }
  .kenzo-tooltip__btn--skip:hover { color: var(--kenzo-text); background: transparent; }

  /* ── Branding bar ── */
  .kenzo-tooltip__brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding-bottom: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.22);
    user-select: none;
    flex-shrink: 0;
  }
  .kenzo-tooltip__brand svg {
    width: 11px;
    height: 11px;
    opacity: 0.5;
  }

  /* ── Arrow ── */
  .kenzo-tooltip__arrow {
    position: absolute;
    width: 10px;
    height: 10px;
    background: var(--kenzo-glass-bg);
    border: 1px solid var(--kenzo-border);
    pointer-events: none;
  }
  .kenzo-tooltip__arrow[data-placement^='top']    { bottom: -5px; transform: rotate(45deg); border-top: none; border-left: none; }
  .kenzo-tooltip__arrow[data-placement^='bottom'] { top: -5px;    transform: rotate(45deg); border-bottom: none; border-right: none; }
  .kenzo-tooltip__arrow[data-placement^='left']   { right: -5px;  transform: rotate(45deg); border-left: none; border-bottom: none; }
  .kenzo-tooltip__arrow[data-placement^='right']  { left: -5px;   transform: rotate(45deg); border-right: none; border-top: none; }

  /* ── Light mode overrides ── */
  #${TOOLTIP_ROOT_ID}.kenzo-tooltip--light {
    --kenzo-glass-bg: rgba(255, 255, 255, 0.96);
    --kenzo-border: rgba(99,102,241,0.14);
    --kenzo-shadow:
      0 0 0 1px rgba(99,102,241,0.14),
      0 8px 16px rgba(0,0,0,0.08),
      0 24px 48px rgba(0,0,0,0.10);
    --kenzo-text: #1e1b4b;
    --kenzo-subtext: rgba(49,46,129,0.65);
    --kenzo-btn-ghost-bg: rgba(99,102,241,0.06);
    --kenzo-btn-ghost-hover: rgba(99,102,241,0.12);
    --kenzo-progress-track: rgba(99,102,241,0.10);
  }
  #${TOOLTIP_ROOT_ID}.kenzo-tooltip--light .kenzo-tooltip__content a { color: #4f46e5; }
  #${TOOLTIP_ROOT_ID}.kenzo-tooltip--light .kenzo-tooltip__content code {
    background: rgba(99,102,241,0.08);
    color: #4f46e5;
  }
  #${TOOLTIP_ROOT_ID}.kenzo-tooltip--light .kenzo-tooltip__title { color: #1e1b4b; }
  #${TOOLTIP_ROOT_ID}.kenzo-tooltip--light .kenzo-tooltip__btn {
    border-color: rgba(99,102,241,0.20);
    color: rgba(49,46,129,0.75);
  }
  #${TOOLTIP_ROOT_ID}.kenzo-tooltip--light .kenzo-tooltip__btn--skip { color: rgba(99,102,241,0.45); }
  #${TOOLTIP_ROOT_ID}.kenzo-tooltip--light .kenzo-tooltip__brand { color: rgba(49,46,129,0.25); }

  /* ══════════════════════════════════════════════════════════════════════════
     ██  MOBILE RESPONSIVE BREAKPOINTS
     ══════════════════════════════════════════════════════════════════════════ */

  /* ── Tablet: ≤ 768px ── */
  @media screen and (max-width: 768px) {
    #${TOOLTIP_ROOT_ID} {
      width: calc(100vw - 20px);
      max-width: calc(100vw - 20px);
      max-height: min(80vh, 480px);
      --kenzo-radius: 12px;
      font-size: 14px;
    }
    #${TOOLTIP_ROOT_ID}.kenzo-tooltip--modal {
      width: calc(100vw - 24px);
      max-width: calc(100vw - 24px);
    }
    .kenzo-tooltip__header {
      padding: 0 14px;
      height: 48px;
    }
    .kenzo-tooltip__close {
      width: 36px;
      height: 36px;
    }
    .kenzo-tooltip__body {
      padding: 16px 16px 0;
    }
    .kenzo-tooltip__title {
      font-size: 15px;
    }
    .kenzo-tooltip__content {
      font-size: 13px;
    }
    .kenzo-tooltip__footer {
      padding: 12px 16px 14px;
      gap: 8px;
    }
    .kenzo-tooltip__btn {
      padding: 10px 16px;
      min-height: 42px;
      font-size: 13px;
    }
    .kenzo-tooltip__btn--skip {
      padding: 10px 10px;
      min-height: 42px;
    }
    .kenzo-tooltip__progress-bar-wrap {
      margin: 12px 16px 0;
    }
    .kenzo-tooltip__brand {
      padding-bottom: 8px;
    }
    /* Hide arrow on mobile — floating-ui positioning is unreliable */
    .kenzo-tooltip__arrow {
      display: none !important;
    }
  }

  /* ── Mobile: ≤ 480px ── */
  @media screen and (max-width: 480px) {
    #${TOOLTIP_ROOT_ID} {
      width: 100vw;
      max-width: 100vw;
      max-height: 75vh;
      border-radius: 16px 16px 0 0;
      --kenzo-radius: 16px 16px 0 0;
      bottom: 0 !important;
      top: auto !important;
      left: 0 !important;
      right: 0 !important;
      transform: none !important;
      animation: kenzo-modal-in-mobile 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    #${TOOLTIP_ROOT_ID}.kenzo-tooltip--modal {
      top: auto !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      transform: none !important;
      width: 100vw;
      max-width: 100vw;
      border-radius: 16px 16px 0 0;
      animation: kenzo-modal-in-mobile 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .kenzo-tooltip__header {
      padding: 0 16px;
      height: 52px;
    }
    .kenzo-tooltip__close {
      width: 40px;
      height: 40px;
    }
    .kenzo-tooltip__close svg {
      width: 12px;
      height: 12px;
    }
    .kenzo-tooltip__body {
      padding: 16px 16px 0;
    }
    .kenzo-tooltip__title {
      font-size: 17px;
      margin: 0 0 10px;
    }
    .kenzo-tooltip__content {
      font-size: 14px;
      line-height: 1.6;
    }
    .kenzo-tooltip__footer {
      padding: 12px 16px 16px;
      gap: 10px;
      flex-wrap: nowrap;
    }
    .kenzo-tooltip__btn {
      padding: 12px 18px;
      min-height: 44px;
      font-size: 14px;
      border-radius: 10px;
      flex: 1;
    }
    .kenzo-tooltip__btn--primary {
      flex: 2;
    }
    .kenzo-tooltip__btn--skip {
      flex: none;
      padding: 12px 10px;
      min-height: 44px;
      font-size: 12px;
    }
    .kenzo-tooltip__step-pill {
      font-size: 10px;
      padding: 4px 10px;
    }
    .kenzo-tooltip__progress-bar-wrap {
      margin: 10px 16px 0;
      height: 4px;
    }
    .kenzo-tooltip__brand {
      padding-bottom: 12px;
      padding-top: 2px;
      font-size: 9px;
    }
    /* Safe area padding for notched phones */
    .kenzo-tooltip__footer {
      padding-bottom: max(16px, env(safe-area-inset-bottom));
    }
  }

  /* ── Small phones: ≤ 360px ── */
  @media screen and (max-width: 360px) {
    #${TOOLTIP_ROOT_ID} {
      max-height: 70vh;
    }
    .kenzo-tooltip__title {
      font-size: 15px;
    }
    .kenzo-tooltip__content {
      font-size: 13px;
    }
    .kenzo-tooltip__btn {
      font-size: 12px;
      padding: 10px 12px;
    }
  }

  /* ── Landscape orientation on mobile ── */
  @media screen and (max-height: 500px) and (orientation: landscape) {
    #${TOOLTIP_ROOT_ID} {
      max-height: 90vh;
    }
    #${TOOLTIP_ROOT_ID}.kenzo-tooltip--modal {
      max-height: 90vh;
    }
    .kenzo-tooltip__header {
      height: 38px;
    }
    .kenzo-tooltip__body {
      padding: 10px 14px 0;
    }
    .kenzo-tooltip__title {
      font-size: 14px;
      margin-bottom: 4px;
    }
    .kenzo-tooltip__content {
      font-size: 12px;
      line-height: 1.5;
    }
    .kenzo-tooltip__footer {
      padding: 8px 14px 10px;
    }
    .kenzo-tooltip__btn {
      min-height: 36px;
      padding: 7px 12px;
    }
    .kenzo-tooltip__brand {
      display: none;
    }
    .kenzo-tooltip__progress-bar-wrap {
      margin: 6px 14px 0;
    }
  }
`;

// ─── Renderer class ───────────────────────────────────────────────────────────

export class TooltipRenderer implements ITooltipRenderer {
  private element: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private zIndex: number | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private readonly sanitizer: IContentSanitizer,
    private readonly zIndexManager: IZIndexManager,
    private readonly darkMode: boolean,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  render(options: TooltipRenderOptions, referenceEl: Element): HTMLElement {
    this.injectStyles();
    this.destroy();

    this.zIndex = this.zIndexManager.allocate();

    if (isModalMode(options)) {
      this.backdrop = this.buildBackdrop(this.zIndex);
      document.body.appendChild(this.backdrop);
      // Lock body scroll on modal (critical for mobile)
      this.lockBodyScroll();
    }

    this.element = this.buildTooltip(options, referenceEl);
    this.element.style.zIndex = String(this.zIndex + 1);

    document.body.appendChild(this.element);
    this.attachKeyboard(options.onAction);

    // Prevent touch-through on modal backdrop
    if (this.backdrop) {
      this.backdrop.addEventListener('touchmove', (e: Event) => e.preventDefault(), { passive: false });
    }

    // Defer focus so animation frame doesn't clip it
    requestAnimationFrame(() => this.element?.focus());

    return this.element;
  }

  update(options: TooltipRenderOptions): void {
    if (!this.element) return;

    const titleEl   = this.element.querySelector<HTMLElement>('.kenzo-tooltip__title');
    const contentEl = this.element.querySelector<HTMLElement>('.kenzo-tooltip__content');
    const footerEl  = this.element.querySelector<HTMLElement>('.kenzo-tooltip__footer');
    const fillEl    = this.element.querySelector<HTMLElement>('.kenzo-tooltip__progress-bar-fill');
    const pillEl    = this.element.querySelector<HTMLElement>('.kenzo-tooltip__step-pill');

    if (titleEl)   titleEl.textContent  = options.step.title;
    if (contentEl) contentEl.innerHTML  = this.sanitizer.sanitizeHtml(options.step.content);
    if (footerEl) {
      footerEl.innerHTML = '';
      this.renderButtons(footerEl, options);
    }
    if (fillEl)  fillEl.style.width = this.progressPercent(options);
    if (pillEl)  pillEl.innerHTML   = this.pillHTML(options);
  }

  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    this.backdrop?.remove();
    this.backdrop = null;

    this.element?.remove();
    this.element = null;

    // Unlock body scroll
    this.unlockBodyScroll();

    if (this.zIndex !== null) {
      this.zIndexManager.release(this.zIndex);
      this.zIndex = null;
    }
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  // ── Private builders ───────────────────────────────────────────────────────

  private buildBackdrop(zBase: number): HTMLElement {
    const el = document.createElement('div');
    el.id = MODAL_BACKDROP_ID;
    el.style.zIndex = String(zBase);
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  private buildTooltip(options: TooltipRenderOptions, referenceEl: Element): HTMLElement {
    void referenceEl; // consumed externally by floating-ui positioner

    const modal = isModalMode(options);
    const dark  = options.darkMode || this.darkMode;

    const el = document.createElement('div');
    el.id = TOOLTIP_ROOT_ID;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'kenzo-tooltip-title');
    el.setAttribute('data-kenzo-overlay', modal ? 'modal' : 'tooltip');
    el.tabIndex = -1;

    el.classList.add(dark ? 'kenzo-tooltip--dark' : 'kenzo-tooltip--light');
    if (modal) el.classList.add('kenzo-tooltip--modal');
    if (options.step.cssClass) el.classList.add(options.step.cssClass);

    // ── Header
    const header = document.createElement('div');
    header.className = 'kenzo-tooltip__header';
    header.innerHTML = `
      <span class="kenzo-tooltip__step-pill" aria-live="polite">
        ${this.pillHTML(options)}
      </span>
      <button class="kenzo-tooltip__close" aria-label="Close tour" data-action="close" type="button">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    // ── Body
    const body = document.createElement('div');
    body.className = 'kenzo-tooltip__body';
    body.innerHTML = `
      <h3 class="kenzo-tooltip__title" id="kenzo-tooltip-title">${this.sanitizer.escapeText(options.step.title)}</h3>
      <div class="kenzo-tooltip__content">${this.sanitizer.sanitizeHtml(options.step.content)}</div>
    `;

    // ── Progress bar
    const progressWrap = document.createElement('div');
    progressWrap.className = 'kenzo-tooltip__progress-bar-wrap';
    progressWrap.setAttribute('aria-hidden', 'true');
    const progressFill = document.createElement('div');
    progressFill.className = 'kenzo-tooltip__progress-bar-fill';
    progressFill.style.width = this.progressPercent(options);
    progressWrap.appendChild(progressFill);

    // ── Footer (buttons)
    const footer = document.createElement('div');
    footer.className = 'kenzo-tooltip__footer';
    this.renderButtons(footer, options);

    // ── Branding
    const brand = document.createElement('div');
    brand.className = 'kenzo-tooltip__brand';
    brand.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Kenzo DAP
    `;

    // ── Arrow (hidden in modal mode)
    const arrow = document.createElement('div');
    arrow.className = 'kenzo-tooltip__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.setAttribute('data-placement', options.step.placement ?? 'bottom');
    if (modal) arrow.style.display = 'none';

    // ── Assemble
    el.appendChild(header);
    el.appendChild(body);
    el.appendChild(progressWrap);
    el.appendChild(footer);
    el.appendChild(brand);
    el.appendChild(arrow);

    // ── Wire close button
    const closeBtn = header.querySelector<HTMLButtonElement>('.kenzo-tooltip__close')!;
    closeBtn.addEventListener('click', () => options.onAction('close'));

    return el;
  }

  // ── Button rendering ───────────────────────────────────────────────────────

  private renderButtons(footer: HTMLElement, options: TooltipRenderOptions): void {
    // Normalize raw buttons (from DB or SDK shape)
    const rawButtons = options.step.buttons as unknown as RawDbButton[] | undefined;
    const normalized = rawButtons && rawButtons.length > 0
      ? rawButtons.map(normalizeButton).filter((b): b is NormalizedButton => b !== null)
      : null;

    let buttons = normalized && normalized.length > 0
      ? normalized
      : this.defaultButtons(options);

    const isLastStep = options.stepIndex >= options.totalSteps - 1;
    if (isLastStep) {
      buttons = buttons.map((btn) => {
        if (btn.action === 'next') {
          return {
            ...btn,
            action: 'finish' as StepAction,
            label: btn.label === 'Next' || btn.label.toLowerCase().includes('next') ? '🎉 Finish Tour' : btn.label,
          };
        }
        return btn;
      });
    }

    for (const btn of buttons) {
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('data-action', btn.action);

      if (btn.action === 'skip') {
        el.className = 'kenzo-tooltip__btn kenzo-tooltip__btn--skip';
        el.textContent = btn.label;
      } else if (btn.primary) {
        el.className = 'kenzo-tooltip__btn kenzo-tooltip__btn--primary';
        el.innerHTML = `${this.sanitizer.escapeText(btn.label)}${this.nextArrowSvg()}`;
      } else {
        el.className = 'kenzo-tooltip__btn';
        el.textContent = btn.label;
      }

      el.addEventListener('click', () => options.onAction(btn.action));
      footer.appendChild(el);
    }
  }

  private defaultButtons(options: TooltipRenderOptions): NormalizedButton[] {
    const buttons: NormalizedButton[] = [];

    // Skip — always first (floats left via CSS margin-right: auto)
    buttons.push({ label: 'Skip tour', action: 'skip', primary: false });

    if (options.stepIndex > 0) {
      buttons.push({ label: '← Back', action: 'previous', primary: false });
    }

    if (options.stepIndex < options.totalSteps - 1) {
      buttons.push({ label: 'Next', action: 'next', primary: true });
    } else {
      buttons.push({ label: 'Finish', action: 'finish', primary: true });
    }

    return buttons;
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  private attachKeyboard(onAction: (action: StepAction) => void): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onAction('close');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onAction('next');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onAction('previous');
          break;
        case 'Enter':
          // Only intercept Enter if no focusable button is the active element
          if (
            document.activeElement === this.element ||
            document.activeElement === document.body
          ) {
            e.preventDefault();
            onAction('next');
          }
          break;
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private progressPercent(options: TooltipRenderOptions): string {
    const pct = options.totalSteps > 0
      ? Math.round(((options.stepIndex + 1) / options.totalSteps) * 100)
      : 100;
    return `${pct}%`;
  }

  private pillHTML(options: TooltipRenderOptions): string {
    return `<span class="kenzo-tooltip__step-dot"></span>Step ${options.stepIndex + 1} of ${options.totalSteps}`;
  }

  private nextArrowSvg(): string {
    return ` <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:inline-block;vertical-align:middle">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // ── Style injection ────────────────────────────────────────────────────────

  private scrollY = 0;

  private lockBodyScroll(): void {
    if (typeof window === 'undefined') return;
    this.scrollY = window.scrollY;
    document.body.classList.add('kenzo-scroll-locked');
    document.body.style.top = `-${this.scrollY}px`;
  }

  private unlockBodyScroll(): void {
    if (typeof window === 'undefined') return;
    document.body.classList.remove('kenzo-scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, this.scrollY);
  }

  private injectStyles(): void {
    if (document.getElementById(STYLES_ID)) return;

    // Add meta viewport check for mobile
    this.ensureViewportMeta();

    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /** Ensure viewport meta tag exists for proper mobile rendering */
  private ensureViewportMeta(): void {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('meta[name="viewport"]');
    if (!existing) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }
  }
}
