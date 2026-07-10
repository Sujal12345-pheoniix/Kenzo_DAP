/**
 * Full-screen backdrop overlay.
 * @module overlay/backdrop
 */

import type { IBackdrop, IZIndexManager } from '@/core/interfaces';

const BACKDROP_ID = 'kenzo-backdrop';

export class Backdrop implements IBackdrop {
  private element: HTMLElement | null = null;
  private zIndex: number | null = null;
  private visible = false;

  constructor(private readonly zIndexManager: IZIndexManager) {}

  show(options?: { opacity?: number; color?: string }): void {
    if (!this.element) {
      this.element = this.createElement();
    }

    const opacity = options?.opacity ?? 0.5;
    const color = options?.color ?? '0, 0, 0';

    this.element.style.backgroundColor = `rgba(${color}, ${opacity})`;

    if (!this.visible) {
      if (this.zIndex === null) {
        this.zIndex = this.zIndexManager.allocate();
        this.element.style.zIndex = String(this.zIndex);
      }
      document.body.appendChild(this.element);
      this.visible = true;
    }
  }

  hide(): void {
    if (this.element && this.visible) {
      this.element.remove();
      this.visible = false;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.hide();
    this.element = null;
    if (this.zIndex !== null) {
      this.zIndexManager.release(this.zIndex);
      this.zIndex = null;
    }
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.id = BACKDROP_ID;
    el.setAttribute('data-kenzo-overlay', 'backdrop');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 100vw',
      'height: 100vh',
      'pointer-events: auto',
      'transition: opacity 200ms ease',
    ].join(';');
    return el;
  }
}
