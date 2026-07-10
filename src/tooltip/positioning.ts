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
      const { x, y, placement: resolvedPlacement } = await computePosition(
        referenceEl,
        tooltipEl,
        {
          placement: placement as Parameters<typeof computePosition>[2] extends infer O
            ? O extends { placement?: infer P }
              ? P
              : never
            : never,
          middleware: [
            offset(TOOLTIP_OFFSET),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            size({
              padding: 8,
              apply({ availableWidth, availableHeight, elements }) {
                Object.assign(elements.floating.style, {
                  maxWidth: `${Math.min(availableWidth, 400)}px`,
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
        position: 'absolute',
      });

      tooltipEl.setAttribute('data-placement', resolvedPlacement);
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
