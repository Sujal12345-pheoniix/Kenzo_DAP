/**
 * Tooltip CSS animations.
 * @module tooltip/animations
 */

import type { ITooltipAnimator } from '@/core/interfaces';

const ENTER_DURATION = 200;
const EXIT_DURATION = 150;

export class TooltipAnimator implements ITooltipAnimator {
  async enter(element: HTMLElement): Promise<void> {
    // Preserve modal centering transform — don't clobber translate(-50%,-50%)
    const isModal = element.classList.contains('kenzo-tooltip--modal');
    const baseTransform = isModal ? 'translate(-50%, -50%) ' : '';

    element.style.opacity = '0';
    element.style.transform = `${baseTransform}scale(0.95)`;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        element.style.transition = `opacity ${ENTER_DURATION}ms ease, transform ${ENTER_DURATION}ms ease`;
        element.style.opacity = '1';
        element.style.transform = `${baseTransform}scale(1)`;
        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, ENTER_DURATION);
      });
    });
  }

  async exit(element: HTMLElement): Promise<void> {
    const isModal = element.classList.contains('kenzo-tooltip--modal');
    const baseTransform = isModal ? 'translate(-50%, -50%) ' : '';

    element.style.transition = `opacity ${EXIT_DURATION}ms ease, transform ${EXIT_DURATION}ms ease`;
    element.style.opacity = '0';
    element.style.transform = `${baseTransform}scale(0.95)`;

    await new Promise<void>((resolve) => {
      setTimeout(resolve, EXIT_DURATION);
    });
  }
}
