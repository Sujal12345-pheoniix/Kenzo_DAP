/**
 * Tooltip CSS animations.
 * @module tooltip/animations
 */

import type { ITooltipAnimator } from '@/core/interfaces';

const ENTER_DURATION = 200;
const EXIT_DURATION = 150;

export class TooltipAnimator implements ITooltipAnimator {
  async enter(element: HTMLElement): Promise<void> {
    element.style.opacity = '0';
    element.style.transform = 'scale(0.95)';

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        element.style.transition = `opacity ${ENTER_DURATION}ms ease, transform ${ENTER_DURATION}ms ease`;
        element.style.opacity = '1';
        element.style.transform = 'scale(1)';
        setTimeout(resolve, ENTER_DURATION);
      });
    });
  }

  async exit(element: HTMLElement): Promise<void> {
    element.style.transition = `opacity ${EXIT_DURATION}ms ease, transform ${EXIT_DURATION}ms ease`;
    element.style.opacity = '0';
    element.style.transform = 'scale(0.95)';

    await new Promise<void>((resolve) => {
      setTimeout(resolve, EXIT_DURATION);
    });
  }
}
