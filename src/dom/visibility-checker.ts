/**
 * Element visibility checker — determines if elements are interactable.
 * @module dom/visibility-checker
 */

import type { IVisibilityChecker } from '@/core/interfaces';

export class VisibilityChecker implements IVisibilityChecker {
  isVisible(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return false;

    const style = window.getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity) === 0
    ) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    let parent = element.parentElement;
    while (parent) {
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
        return false;
      }
      parent = parent.parentElement;
    }

    return true;
  }

  isInViewport(element: Element, threshold = 0): boolean {
    const rect = element.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewWidth = window.innerWidth || document.documentElement.clientWidth;

    const vertVisible = rect.top <= viewHeight - threshold && rect.bottom >= threshold;
    const horizVisible = rect.left <= viewWidth - threshold && rect.right >= threshold;

    return vertVisible && horizVisible;
  }

  getEffectiveOpacity(element: Element): number {
    let opacity = 1;
    let current: Element | null = element;

    while (current) {
      if (current instanceof HTMLElement) {
        const style = window.getComputedStyle(current);
        opacity *= parseFloat(style.opacity);
      }
      current = current.parentElement;
    }

    return opacity;
  }
}
