/**
 * Floating UI positioning integration.
 * @module tooltip/positioning
 */

import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';

import type { ITooltipPositioner } from '@/core/interfaces';

const TOOLTIP_OFFSET = 12;

export class TooltipPositioner implements ITooltipPositioner {
  private cleanupAutoUpdate: (() => void) | null = null;

  async position(
    tooltipEl: HTMLElement,
    referenceEl: Element,
    placement: string,
  ): Promise<void> {
    this.destroyAutoUpdate();

    const update = async (): Promise<void> => {
      // Re-evaluate mobile viewport dynamically on every position update
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480;
      if (isMobile) {
        return;
      }

      // floating-ui throws an error if placement is 'auto'; default to 'bottom' if auto or empty
      const targetPlacement = (!placement || placement === 'auto') ? 'bottom' : placement;

      const { x, y, placement: resolvedPlacement } = await computePosition(
        referenceEl,
        tooltipEl,
        {
          strategy: 'fixed',
          placement: targetPlacement as any,
          middleware: [
            offset(TOOLTIP_OFFSET),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            size({
              padding: 8,
              apply({ availableWidth, availableHeight, elements }) {
                const vw = typeof window !== 'undefined' ? window.innerWidth : 9999;
                Object.assign(elements.floating.style, {
                  maxWidth: `${Math.min(availableWidth, vw - 24, 400)}px`,
                  maxHeight: `${availableHeight}px`,
                });
              },
            }),
          ],
        },
      );

      Object.assign(tooltipEl.style, {
        left: `${x}px`,
        top: `${y}px`,
        position: 'fixed',
      });

      tooltipEl.setAttribute('data-placement', resolvedPlacement);

      // Crucial: Update data-placement on arrow element so CSS arrow rotation matches flipped placement
      const arrowEl = tooltipEl.querySelector<HTMLElement>('.kenzo-tooltip__arrow');
      if (arrowEl) {
        arrowEl.setAttribute('data-placement', resolvedPlacement);
      }
    };

    await update();
    this.cleanupAutoUpdate = autoUpdate(referenceEl, tooltipEl, update);
  }

  destroy(): void {
    this.destroyAutoUpdate();
  }

  private destroyAutoUpdate(): void {
    if (this.cleanupAutoUpdate) {
      this.cleanupAutoUpdate();
      this.cleanupAutoUpdate = null;
    }
  }
}
