/**
 * SVG mask layer with spotlight cutout.
 * Uses clip-path for performant rendering without inline eval.
 * @module overlay/mask-layer
 */

import type { IMaskLayer, IZIndexManager } from '@/core/interfaces';
import type { SpotlightRect } from '@/types';

const MASK_ID = 'kenzo-mask-layer';

export class MaskLayer implements IMaskLayer {
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
    this.applyCutout(rect, padding);
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
    this.element.style.display = 'block';
    this.applyCutout(rect, padding);
  }

  destroy(): void {
    this.element?.remove();
    this.element = null;
    if (this.zIndex !== null) {
      this.zIndexManager.release(this.zIndex);
      this.zIndex = null;
    }
  }

  private applyCutout(rect: SpotlightRect, padding: number): void {
    if (!this.element) return;

    // Use viewport-relative coordinates (no scrollY/scrollX for position: fixed)
    const top = rect.top - padding;
    const left = rect.left - padding;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;
    const radius = rect.borderRadius ?? 4;

    const clipPath = `polygon(
      0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
      ${left}px ${top}px,
      ${left}px ${top + height}px,
      ${left + width}px ${top + height}px,
      ${left + width}px ${top}px,
      ${left}px ${top}px
    )`;

    this.element.style.clipPath = clipPath;
    this.element.style.borderRadius = `${radius}px`;
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.id = MASK_ID;
    el.setAttribute('data-kenzo-overlay', 'mask');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 100vw',
      'height: 100vh',
      'background: rgba(0, 0, 0, 0.6)',
      'pointer-events: auto',
      'transition: clip-path 200ms ease',
    ].join(';');
    return el;
  }
}
