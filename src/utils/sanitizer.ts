/**
 * Content sanitizer — prevents XSS in tooltip content.
 * Never executes arbitrary HTML; escapes all user-supplied strings.
 * @module utils/sanitizer
 */

import type { IContentSanitizer } from '@/core/interfaces';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'span', 'ul', 'ol', 'li']);

export class ContentSanitizer implements IContentSanitizer {
  escapeText(text: string): string {
    return text.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
  }

  sanitizeHtml(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;

    const sanitizeNode = (node: Node): void => {
      const childNodes = Array.from(node.childNodes);
      for (const child of childNodes) {
        if (child.nodeType === Node.TEXT_NODE) continue;

        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as Element;
          const tag = el.tagName.toLowerCase();

          if (!ALLOWED_TAGS.has(tag)) {
            const text = document.createTextNode(el.textContent ?? '');
            el.replaceWith(text);
            continue;
          }

          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on') || name === 'style' || name === 'href' || name === 'src') {
              el.removeAttribute(attr.name);
            }
          }

          sanitizeNode(el);
        } else {
          child.remove();
        }
      }
    };

    sanitizeNode(template.content);
    return template.innerHTML;
  }
}
