/**
 * Overlay orchestrator — coordinates backdrop, mask, and spotlight.
 * @module overlay/overlay-manager
 */

import type {
  IBackdrop,
  IMaskLayer,
  IOverlayManager,
  ISpotlight,
} from '@/core/interfaces';
import type { SpotlightRect } from '@/types';

export class OverlayManager implements IOverlayManager {
  private activeElement: Element | null = null;
  private resizeHandler: (() => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private orientationHandler: (() => void) | null = null;
  private currentMode: 'spotlight' | 'highlight' | null = null;
  private currentPadding = 8;
  private rafId: number | null = null;

  constructor(
    private readonly backdrop: IBackdrop,
    private readonly maskLayer: IMaskLayer,
    private readonly spotlight: ISpotlight,
  ) {}

  showSpotlight(
    element: Element,
    options?: { padding?: number; blockInteraction?: boolean },
  ): void {
    this.cleanupListeners();
    this.activeElement = element;
    this.currentMode = 'spotlight';
    this.currentPadding = options?.padding ?? 8;

    const rect = this.getSpotlightRect(element);
    this.spotlight.show(rect, this.currentPadding);

    if (options?.blockInteraction !== false) {
      this.maskLayer.show(rect, this.currentPadding);
    } else {
      this.backdrop.show({ opacity: 0.3 });
    }

    this.attachListeners();
  }

  showHighlight(element: Element): void {
    this.cleanupListeners();
    this.activeElement = element;
    this.currentMode = 'highlight';
    this.currentPadding = 4;

    const rect = this.getSpotlightRect(element);
    this.spotlight.show(rect, this.currentPadding);
    this.attachListeners();
  }

  hide(): void {
    this.cleanupListeners();
    this.spotlight.hide();
    this.maskLayer.hide();
    this.backdrop.hide();
    this.activeElement = null;
    this.currentMode = null;
  }

  destroy(): void {
    this.hide();
    this.spotlight.destroy();
    this.maskLayer.destroy();
    this.backdrop.destroy();
  }

  private attachListeners(): void {
    const update = () => {
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        if (!this.activeElement) return;
        const rect = this.getSpotlightRect(this.activeElement);
        this.spotlight.update(rect, this.currentPadding);
        if (this.currentMode === 'spotlight') {
          this.maskLayer.update(rect, this.currentPadding);
        }
      });
    };

    this.resizeHandler = update;
    this.scrollHandler = update;

    window.addEventListener('resize', this.resizeHandler, { passive: true });
    window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });

    // Mobile: orientation change triggers viewport recalculation
    this.orientationHandler = () => {
      // Delay to let the viewport settle after orientation change
      setTimeout(update, 300);
    };
    window.addEventListener('orientationchange', this.orientationHandler, { passive: true });

    // Mobile: also listen to visualViewport changes (keyboard popup, pinch zoom)
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.resizeHandler, { passive: true });
      window.visualViewport.addEventListener('scroll', this.scrollHandler, { passive: true });
    }
  }

  private cleanupListeners(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', this.resizeHandler);
        window.visualViewport.removeEventListener('scroll', this.resizeHandler);
      }
      this.resizeHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      this.scrollHandler = null;
    }
    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler);
      this.orientationHandler = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private getSpotlightRect(element: Element): SpotlightRect {
    const domRect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const borderRadius = parseFloat(style.borderRadius) || 4;

    return {
      top: domRect.top,
      left: domRect.left,
      width: domRect.width,
      height: domRect.height,
      borderRadius,
    };
  }
}
