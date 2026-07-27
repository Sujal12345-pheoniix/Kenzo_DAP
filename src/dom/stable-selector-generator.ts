/**
 * Multi-Strategy Stable Selector Generator
 * Generates ranked selector candidates based on stability scoring and uniqueness.
 * @module dom/stable-selector-generator
 */

export interface SelectorCandidate {
  strategy: string;
  value: string;
  uniqueness: number;
  stabilityScore: number;
  confidence: number;
  fallbackRank: number;
}

export class StableSelectorGenerator {
  generateCandidates(element: Element): SelectorCandidate[] {
    const candidates: SelectorCandidate[] = [];

    // 1. Explicit Kenzo ID attribute
    const kenzoId = element.getAttribute('data-kenzo-id');
    if (kenzoId) {
      candidates.push({
        strategy: 'kenzo-id',
        value: `[data-kenzo-id="${CSS.escape(kenzoId)}"]`,
        uniqueness: 1.0,
        stabilityScore: 1.0,
        confidence: 1.0,
        fallbackRank: 1,
      });
    }

    // 2. Unique ID
    if (element.id && !/\d{5,}/.test(element.id)) {
      const isUnique = document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1;
      candidates.push({
        strategy: 'unique-id',
        value: `#${CSS.escape(element.id)}`,
        uniqueness: isUnique ? 1.0 : 0.5,
        stabilityScore: 0.95,
        confidence: isUnique ? 0.95 : 0.6,
        fallbackRank: 2,
      });
    }

    // 3. Test IDs
    ['data-testid', 'data-test', 'data-qa', 'data-cy'].forEach(attr => {
      const val = element.getAttribute(attr);
      if (val) {
        const sel = `[${attr}="${CSS.escape(val)}"]`;
        const count = document.querySelectorAll(sel).length;
        candidates.push({
          strategy: 'test-id',
          value: sel,
          uniqueness: count === 1 ? 1.0 : 1 / count,
          stabilityScore: 0.9,
          confidence: count === 1 ? 0.9 : 0.7,
          fallbackRank: 3,
        });
      }
    });

    // 4. ARIA Role + Accessible Name
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      const sel = role ? `[role="${CSS.escape(role)}"][aria-label="${CSS.escape(ariaLabel)}"]` : `[aria-label="${CSS.escape(ariaLabel)}"]`;
      const count = document.querySelectorAll(sel).length;
      candidates.push({
        strategy: 'aria-accessible-name',
        value: sel,
        uniqueness: count === 1 ? 1.0 : 1 / count,
        stabilityScore: 0.85,
        confidence: count === 1 ? 0.85 : 0.65,
        fallbackRank: 4,
      });
    }

    // 5. Name / Type
    const name = element.getAttribute('name');
    if (name) {
      const tag = element.tagName.toLowerCase();
      const sel = `${tag}[name="${CSS.escape(name)}"]`;
      const count = document.querySelectorAll(sel).length;
      candidates.push({
        strategy: 'name-attribute',
        value: sel,
        uniqueness: count === 1 ? 1.0 : 1 / count,
        stabilityScore: 0.8,
        confidence: count === 1 ? 0.8 : 0.6,
        fallbackRank: 5,
      });
    }

    // 6. Text content (short text)
    const text = element.textContent?.trim();
    if (text && text.length > 2 && text.length < 40) {
      const tag = element.tagName.toLowerCase();
      candidates.push({
        strategy: 'text-match',
        value: `${tag}:contains("${text}")`,
        uniqueness: 0.7,
        stabilityScore: 0.75,
        confidence: 0.75,
        fallbackRank: 6,
      });
    }

    // 7. Stable Class combinations
    const classes = Array.from(element.classList).filter(c => !c.startsWith('kenzo-') && !/\d{4,}/.test(c));
    if (classes.length > 0) {
      const classSel = '.' + classes.map(c => CSS.escape(c)).join('.');
      const count = document.querySelectorAll(classSel).length;
      candidates.push({
        strategy: 'class-combination',
        value: classSel,
        uniqueness: count === 1 ? 1.0 : 1 / count,
        stabilityScore: 0.6,
        confidence: count === 1 ? 0.7 : 0.4,
        fallbackRank: 7,
      });
    }

    // 8. Structural CSS Path
    candidates.push({
      strategy: 'css-path',
      value: this.getCssPath(element),
      uniqueness: 1.0,
      stabilityScore: 0.5,
      confidence: 0.6,
      fallbackRank: 8,
    });

    // Sort candidates by confidence descending
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  private getCssPath(el: Element): string {
    const path: string[] = [];
    let current: Element | null = el;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id && !/\d{5,}/.test(current.id)) {
        selector += `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      } else {
        const parent: Element | null = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }
}
