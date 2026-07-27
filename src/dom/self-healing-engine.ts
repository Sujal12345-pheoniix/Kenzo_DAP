/**
 * Self-Healing Targeting Engine
 * Non-destructively recovers missing or damaged target elements using multi-stage candidate scoring.
 * @module dom/self-healing-engine
 */

import type { ElementSelector } from '@/types';

export interface RepairResult {
  recoveredElement: Element | null;
  confidence: number;
  strategyUsed: string | null;
  repairedSelector: string | null;
}

export class SelfHealingEngine {
  /**
   * Attempts recovery when a primary selector fails to find an element.
   */
  attemptRecovery(selector: ElementSelector, expectedText?: string, expectedRole?: string): RepairResult {
    // 1. Fallback selectors if provided in array or alternate properties
    if (selector.css && selector.css.includes(',')) {
      const parts = selector.css.split(',').map(s => s.trim()).filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        try {
          const found = document.querySelector(parts[i]);
          if (found) {
            return {
              recoveredElement: found,
              confidence: 0.85,
              strategyUsed: 'fallback-selector-list',
              repairedSelector: parts[i],
            };
          }
        } catch (_) {}
      }
    }

    // 2. Try Accessible Name or Text Content Similarity
    if (expectedText && expectedText.trim()) {
      const targetText = expectedText.trim().toLowerCase();
      const candidates = document.querySelectorAll('button, a, input, select, textarea, [role="button"], .btn');

      let bestMatch: Element | null = null;
      let highestScore = 0;

      candidates.forEach(el => {
        const elText = (el.textContent || el.getAttribute('aria-label') || (el as HTMLInputElement).placeholder || '').trim().toLowerCase();
        if (!elText) return;

        let score = 0;
        if (elText === targetText) score = 0.9;
        else if (elText.includes(targetText) || targetText.includes(elText)) score = 0.75;

        if (expectedRole && el.getAttribute('role') === expectedRole) {
          score += 0.1;
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = el;
        }
      });

      if (bestMatch && highestScore >= 0.7) {
        return {
          recoveredElement: bestMatch,
          confidence: highestScore,
          strategyUsed: 'text-similarity-recovery',
          repairedSelector: this.generateSimpleSelector(bestMatch),
        };
      }
    }

    // 3. Fallback: No confident recovery
    return {
      recoveredElement: null,
      confidence: 0,
      strategyUsed: null,
      repairedSelector: null,
    };
  }

  private generateSimpleSelector(el: Element): string {
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.getAttribute('name')) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.getAttribute('name')!)}"]`;
    return el.tagName.toLowerCase();
  }
}
