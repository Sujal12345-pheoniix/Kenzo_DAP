/**
 * Spotlight highlight border around target element.
 * @module overlay/spotlight
 */

import type { ISpotlight, IZIndexManager } from '@/core/interfaces';
import type { SpotlightRect } from '@/types';

const SPOTLIGHT_ID = 'kenzo-spotlight';

export class Spotlight implements ISpotlight {
  private element: HTMLElement | null = null;
  private zIndex: number | null = null;

  constructor(private readonly zIndexManager: IZIndexManager) {}

  show(rect: SpotlightRect, padding = 8): void {
    if (!this.element) {
      this.element = this.createElement();
      document.body.appendChild(this.element);
      this.zIndex = this.zIndexManager.allocate();
      this.element.style.zIndex = String(this.zIndex);
    }
    this.position(rect, padding);
    this.element.style.display = 'block';
  }

  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  update(rect: SpotlightRect, padding = 8): void {
    if (!this.element) {
      this.show(rect, padding);
      return;
    }
    this.position(rect, padding);
  }

  destroy(): void {
    this.element?.remove();
    this.element = null;
    if (this.zIndex !== null) {
      this.zIndexManager.release(this.zIndex);
      this.zIndex = null;
    }
  }

  private position(rect: SpotlightRect, padding: number): void {
    if (!this.element) return;

    const top = rect.top - padding + window.scrollY;
    const left = rect.left - padding + window.scrollX;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;
    const radius = (rect.borderRadius ?? 4) + padding;

    Object.assign(this.element.style, {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: `${radius}px`,
    });
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.id = SPOTLIGHT_ID;
    el.setAttribute('data-kenzo-overlay', 'spotlight');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = [
      'position: absolute',
      'pointer-events: none',
      'box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6)',
      'border: 2px solid #4F46E5',
      'transition: top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease',
    ].join(';');
    return el;
  }
}
