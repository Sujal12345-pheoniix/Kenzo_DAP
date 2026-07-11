/**
 * Tooltip renderer — creates accessible, sanitized tooltip DOM.
 * @module tooltip/renderer
 */

import type {
  IContentSanitizer,
  ITooltipRenderer,
  IZIndexManager,
} from '@/core/interfaces';
import type { StepAction, TooltipRenderOptions } from '@/types';

const TOOLTIP_ROOT_ID = 'kenzo-tooltip';
const STYLES_ID = 'kenzo-tooltip-styles';

export class TooltipRenderer implements ITooltipRenderer {
  private element: HTMLElement | null = null;
  private zIndex: number | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private readonly sanitizer: IContentSanitizer,
    private readonly zIndexManager: IZIndexManager,
    private readonly darkMode: boolean,
  ) {}

  render(options: TooltipRenderOptions, referenceEl: Element): HTMLElement {
    this.injectStyles();
    this.destroy();

    this.element = this.buildTooltip(options, referenceEl);
    this.zIndex = this.zIndexManager.allocate();
    this.element.style.zIndex = String(this.zIndex);

    document.body.appendChild(this.element);
    this.attachKeyboard(options.onAction);
    this.element.focus();

    return this.element;
  }

  update(options: TooltipRenderOptions): void {
    if (!this.element) return;

    const title = this.element.querySelector('.kenzo-tooltip__title');
    const content = this.element.querySelector('.kenzo-tooltip__content');
    const footer = this.element.querySelector('.kenzo-tooltip__footer');
    const progress = this.element.querySelector('.kenzo-tooltip__progress');

    if (title) title.textContent = options.step.title;
    if (content) {
      content.innerHTML = this.sanitizer.sanitizeHtml(options.step.content);
    }
    if (footer) {
      footer.innerHTML = '';
      this.renderButtons(footer as HTMLElement, options);
    }
    if (progress) {
      progress.textContent = `${options.stepIndex + 1} / ${options.totalSteps}`;
    }
  }

  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    this.element?.remove();
    this.element = null;

    if (this.zIndex !== null) {
      this.zIndexManager.release(this.zIndex);
      this.zIndex = null;
    }
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  private buildTooltip(options: TooltipRenderOptions, referenceEl: Element): HTMLElement {
    const el = document.createElement('div');
    el.id = TOOLTIP_ROOT_ID;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'kenzo-tooltip-title');
    el.setAttribute('data-kenzo-overlay', 'tooltip');
    el.tabIndex = -1;

    if (options.darkMode || this.darkMode) {
      el.classList.add('kenzo-tooltip--dark');
    }
    if (options.step.cssClass) {
      el.classList.add(options.step.cssClass);
    }

    el.innerHTML = `
      <div class="kenzo-tooltip__header">
        <span class="kenzo-tooltip__progress" aria-live="polite">${options.stepIndex + 1} / ${options.totalSteps}</span>
        <button class="kenzo-tooltip__close" aria-label="Close tour" data-action="close" type="button">&times;</button>
      </div>
      <h3 class="kenzo-tooltip__title" id="kenzo-tooltip-title">${this.sanitizer.escapeText(options.step.title)}</h3>
      <div class="kenzo-tooltip__content">${this.sanitizer.sanitizeHtml(options.step.content)}</div>
      <div class="kenzo-tooltip__footer"></div>
      <div class="kenzo-tooltip__arrow" aria-hidden="true"></div>
    `;

    const footer = el.querySelector('.kenzo-tooltip__footer') as HTMLElement;
    this.renderButtons(footer, options);

    const closeBtn = el.querySelector('.kenzo-tooltip__close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => options.onAction('close'));

    void referenceEl;
    return el;
  }

  private renderButtons(footer: HTMLElement, options: TooltipRenderOptions): void {
    const buttons = (options.step.buttons && options.step.buttons.length > 0)
      ? options.step.buttons
      : this.getDefaultButtons(options);

    for (const btn of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = btn.label;
      button.className = btn.primary
        ? 'kenzo-tooltip__btn kenzo-tooltip__btn--primary'
        : 'kenzo-tooltip__btn';
      button.setAttribute('data-action', btn.action);
      button.addEventListener('click', () => options.onAction(btn.action));
      footer.appendChild(button);
    }
  }

  private getDefaultButtons(options: TooltipRenderOptions): Array<{
    label: string;
    action: StepAction;
    primary?: boolean;
  }> {
    const buttons: Array<{ label: string; action: StepAction; primary?: boolean }> = [];

    if (options.stepIndex > 0) {
      buttons.push({ label: 'Previous', action: 'previous' });
    }

    if (options.stepIndex < options.totalSteps - 1) {
      buttons.push({ label: 'Next', action: 'next', primary: true });
    } else {
      buttons.push({ label: 'Finish', action: 'finish', primary: true });
    }

    buttons.push({ label: 'Skip', action: 'skip' });
    return buttons;
  }

  private attachKeyboard(onAction: (action: StepAction) => void): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onAction('close');
          break;
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          onAction('next');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onAction('previous');
          break;
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  private injectStyles(): void {
    if (document.getElementById(STYLES_ID)) return;

    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = `
      .kenzo-tooltip {
        position: absolute;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #1a1a2e;
        max-width: 400px;
        outline: none;
      }
      .kenzo-tooltip--dark {
        background: #1e1e2e;
        color: #e0e0e0;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      }
      .kenzo-tooltip__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .kenzo-tooltip__progress {
        font-size: 12px;
        color: #6b7280;
      }
      .kenzo-tooltip--dark .kenzo-tooltip__progress { color: #9ca3af; }
      .kenzo-tooltip__close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6b7280;
        padding: 0 4px;
        line-height: 1;
      }
      .kenzo-tooltip__title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
      }
      .kenzo-tooltip__content { margin-bottom: 16px; }
      .kenzo-tooltip__content p { margin: 0 0 8px; }
      .kenzo-tooltip__footer {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .kenzo-tooltip__btn {
        padding: 6px 16px;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background 150ms ease;
      }
      .kenzo-tooltip__btn:hover { background: #f3f4f6; }
      .kenzo-tooltip__btn--primary {
        background: #4F46E5;
        color: #ffffff;
        border-color: #4F46E5;
      }
      .kenzo-tooltip__btn--primary:hover { background: #4338CA; }
      .kenzo-tooltip--dark .kenzo-tooltip__btn {
        background: #2d2d3f;
        border-color: #4b5563;
        color: #e0e0e0;
      }
      .kenzo-tooltip--dark .kenzo-tooltip__btn--primary {
        background: #6366F1;
        border-color: #6366F1;
      }
      .kenzo-tooltip__arrow {
        position: absolute;
        width: 8px;
        height: 8px;
        background: inherit;
        transform: rotate(45deg);
      }
    `;

    const firstRule = style.textContent.indexOf('.kenzo-tooltip {');
    if (firstRule !== -1) {
      style.textContent =
        style.textContent.slice(0, firstRule + '.kenzo-tooltip'.length) +
        ', [data-kenzo-overlay="tooltip"]' +
        style.textContent.slice(firstRule + '.kenzo-tooltip'.length);
    }

    document.head.appendChild(style);
  }
}
