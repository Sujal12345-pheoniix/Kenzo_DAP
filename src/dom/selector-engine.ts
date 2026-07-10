/**
 * Multi-strategy CSS/XPath selector engine.
 * @module dom/selector-engine
 */

import type { ISelectorEngine } from '@/core/interfaces';
import type { ElementSelector } from '@/types';

export class SelectorEngine implements ISelectorEngine {
  query(selector: ElementSelector): Element[] {
    const results: Element[] = [];

    if (selector.css) {
      results.push(...Array.from(document.querySelectorAll(selector.css)));
    }

    if (selector.xpath) {
      const xpathResult = document.evaluate(
        selector.xpath,
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
    }

    if (selector.text) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node = walker.nextNode();
      while (node) {
        if (node.textContent?.trim() === selector.text.trim()) {
          results.push(node as Element);
        }
        node = walker.nextNode();
      }
    }

    if (selector.ariaLabel) {
      results.push(
        ...Array.from(
          document.querySelectorAll(`[aria-label="${CSS.escape(selector.ariaLabel)}"]`),
        ),
      );
    }

    if (selector.dataAttribute) {
      const { key, value } = selector.dataAttribute;
      const attr = `data-${key}`;
      if (value !== undefined) {
        results.push(
          ...Array.from(document.querySelectorAll(`[${attr}="${CSS.escape(value)}"]`)),
        );
      } else {
        results.push(...Array.from(document.querySelectorAll(`[${attr}]`)));
      }
    }

    const unique = [...new Set(results)];

    if (selector.index !== undefined && selector.index >= 0) {
      const el = unique[selector.index];
      return el ? [el] : [];
    }

    return unique;
  }

  queryOne(selector: ElementSelector): Element | null {
    const results = this.query(selector);
    return results[0] ?? null;
  }

  isValid(selector: ElementSelector): boolean {
    return !!(
      selector.css ||
      selector.xpath ||
      selector.text ||
      selector.ariaLabel ||
      selector.dataAttribute
    );
  }
}
