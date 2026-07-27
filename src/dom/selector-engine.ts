/**
 * Multi-strategy CSS/XPath selector engine with DB format normalization.
 * @module dom/selector-engine
 */

import type { ISelectorEngine } from '@/core/interfaces';
import type { ElementSelector } from '@/types';

export class SelectorEngine implements ISelectorEngine {
  query(selector: ElementSelector): Element[] {
    // Normalize from DB format { type: 'css', value: '#nav' } to SDK format { css: '#nav' }
    const normalized = this.normalize(selector);
    const results: Element[] = [];

    if (normalized.css) {
      // Support comma-separated fallback selectors — use first that finds elements
      const selectors = normalized.css.split(',').map(s => s.trim()).filter(Boolean);
      for (const sel of selectors) {
        try {
          const found = Array.from(document.querySelectorAll(sel));
          if (found.length > 0) {
            results.push(...found);
            break;
          }
        } catch (_) {
          // Invalid selector syntax, skip silently
        }
      }
    }

    if (normalized.xpath) {
      try {
        const xpathResult = document.evaluate(
          normalized.xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null,
        );
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          const node = xpathResult.snapshotItem(i);
          if (node instanceof Element) {
            results.push(node);
          }
        }
      } catch (_) {}
    }

    if (normalized.text) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node = walker.nextNode();
      while (node) {
        if (node.textContent?.trim() === normalized.text.trim()) {
          results.push(node as Element);
        }
        node = walker.nextNode();
      }
    }

    if (normalized.ariaLabel) {
      try {
        results.push(
          ...Array.from(
            document.querySelectorAll(`[aria-label="${CSS.escape(normalized.ariaLabel)}"]`),
          ),
        );
      } catch (_) {}
    }

    if (normalized.dataAttribute) {
      const { key, value } = normalized.dataAttribute;
      const attr = `data-${key}`;
      try {
        if (value !== undefined) {
          results.push(
            ...Array.from(document.querySelectorAll(`[${attr}="${CSS.escape(value)}"]`)),
          );
        } else {
          results.push(...Array.from(document.querySelectorAll(`[${attr}]`)));
        }
      } catch (_) {}
    }

    const unique = [...new Set(results)];

    // Return matches or empty if not found
    if (normalized.index !== undefined && normalized.index >= 0) {
      const el = unique[normalized.index];
      return el ? [el] : [];
    }

    return unique;
  }

  queryOne(selector: ElementSelector): Element | null {
    const normalized = this.normalize(selector);
    // Explicit body target check
    if (normalized.css === 'body' || (normalized as any).value === 'body') {
      return document.body;
    }
    const results = this.query(selector);
    return results[0] ?? null;
  }

  isValid(selector: ElementSelector): boolean {
    const normalized = this.normalize(selector);
    return !!(normalized.css || normalized.xpath || normalized.text || normalized.ariaLabel || normalized.dataAttribute);
  }

  /**
   * Normalize from DB format { type: 'css'|'xpath'|'text', value: '...' }
   * to SDK ElementSelector format { css: '...' }
   */
  private normalize(selector: ElementSelector): ElementSelector {
    // Already in SDK format
    if (selector.css || selector.xpath || selector.text || selector.ariaLabel || selector.dataAttribute) {
      return selector;
    }

    // DB format: { type: 'css', value: '#nav, .header' }
    const s = selector as any;
    if (s.type && s.value) {
      switch (s.type) {
        case 'css':
          return { css: s.value as string };
        case 'xpath':
          return { xpath: s.value as string };
        case 'text':
          return { text: s.value as string };
        default:
          return { css: s.value as string };
      }
    }

    // Handle plain string selector
    if (typeof s === 'string') {
      return { css: s };
    }

    // Absolute fallback
    return { css: 'body' };
  }
}
