/**
 * Composite Element Fingerprinting & Resolution Engine.
 * Weighted-scoring match algorithm against live DOM (including Shadow DOM piercing).
 * Pure & testable.
 * @module dom/fingerprint
 */

export interface DomPathNode {
  tagName: string;
  nthOfType: number;
  classList: string[];
}

export interface ElementFingerprint {
  tagName: string;
  id?: string;
  classList: string[];
  attributes: Record<string, string>;
  textContent: string;
  domPath: DomPathNode[];
  siblingIndex: number;
  siblingCount: number;
  boundingBoxRatio: { widthRatio: number; heightRatio: number };
  cssSelectorHint?: string;
}

function escapeCss(str: string): string {
  if (typeof CSS !== 'undefined' && typeof (CSS as any).escape === 'function') {
    return (CSS as any).escape(str);
  }
  return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

/**
 * Capture a composite Fingerprint from a live DOM Element.
 */
export function captureFingerprint(element: Element): ElementFingerprint {
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? element.id.trim() : undefined;
  
  // Class names (excluding common volatile frameworks dynamic classes if needed)
  const classList = Array.from(element.classList);

  // Attributes capture (data-*, aria-*, name, role, type, href, placeholder, title)
  const attributes: Record<string, string> = {};
  const relevantAttrs = ['name', 'role', 'type', 'href', 'placeholder', 'title', 'value', 'alt'];
  
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (
      attr.name.startsWith('data-') ||
      attr.name.startsWith('aria-') ||
      relevantAttrs.includes(attr.name)
    ) {
      // Avoid huge inline attributes
      if (attr.value && attr.value.length < 200) {
        attributes[attr.name] = attr.value;
      }
    }
  }

  // Normalized text content
  const textContent = (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);

  // DOM Path construction up to 6 ancestor levels
  const domPath: DomPathNode[] = [];
  let curr: HTMLElement | Element | null = element;
  while (curr && curr !== document.body && curr !== document.documentElement && domPath.length < 6) {
    const parentNode: HTMLElement | Element | null = curr.parentElement;
    let nthOfType = 1;
    if (parentNode) {
      const targetTag = curr.tagName;
      const siblings = Array.from(parentNode.children).filter(
        (c: Element) => c.tagName === targetTag
      );
      nthOfType = siblings.indexOf(curr) + 1;
    }
    domPath.push({
      tagName: curr.tagName.toLowerCase(),
      nthOfType,
      classList: Array.from(curr.classList),
    });
    curr = parentNode;
  }

  // Sibling index and count
  let siblingIndex = 0;
  let siblingCount = 1;
  if (element.parentElement) {
    const siblings = Array.from(element.parentElement.children);
    siblingIndex = siblings.indexOf(element);
    siblingCount = siblings.length;
  }

  // Bounding box ratio (width and height relative to window if available)
  let widthRatio = 0;
  let heightRatio = 0;
  if (typeof window !== 'undefined' && window.innerWidth && window.innerHeight) {
    const rect = element.getBoundingClientRect();
    widthRatio = Math.round((rect.width / window.innerWidth) * 1000) / 1000;
    heightRatio = Math.round((rect.height / window.innerHeight) * 1000) / 1000;
  }

  // Generate fallback CSS selector hint
  let cssSelectorHint = tagName;
  if (id) {
    cssSelectorHint = `#${escapeCss(id)}`;
  } else if (classList.length > 0) {
    cssSelectorHint = `${tagName}.${classList.slice(0, 2).map(c => escapeCss(c)).join('.')}`;
  }

  return {
    tagName,
    id,
    classList,
    attributes,
    textContent,
    domPath,
    siblingIndex,
    siblingCount,
    boundingBoxRatio: { widthRatio, heightRatio },
    cssSelectorHint,
  };
}

/**
 * Compute text similarity score between 0 and 1.
 */
function textSimilarity(a: string, b: string): number {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  if (a === b) return 1.0;
  const aNorm = a.toLowerCase();
  const bNorm = b.toLowerCase();
  if (aNorm === bNorm) return 0.95;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return 0.8;
  
  // Dice coefficient on bigrams
  const getBigrams = (str: string) => {
    const s = str.toLowerCase();
    const bg = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      bg.add(s.slice(i, i + 2));
    }
    return bg;
  };
  const bgA = getBigrams(a);
  const bgB = getBigrams(b);
  let intersection = 0;
  bgA.forEach(b => {
    if (bgB.has(b)) intersection++;
  });
  return (2 * intersection) / (bgA.size + bgB.size || 1);
}

/**
 * Score how well a candidate Element matches a given Fingerprint (0.0 to 1.0).
 */
export function scoreMatch(candidate: Element, fingerprint: ElementFingerprint): number {
  const candidateTag = candidate.tagName.toLowerCase();
  if (candidateTag !== fingerprint.tagName) {
    // Tag mismatch heavily penalizes unless anchor tags/buttons interact similarly
    if (
      !(
        (candidateTag === 'a' && fingerprint.tagName === 'button') ||
        (candidateTag === 'button' && fingerprint.tagName === 'a') ||
        (candidateTag === 'div' && fingerprint.tagName === 'span')
      )
    ) {
      return 0.1;
    }
  }

  let totalScore = 0;
  let totalWeight = 0;

  // 1. ID Match (Weight: 30)
  const candidateId = candidate.id ? candidate.id.trim() : undefined;
  if (fingerprint.id) {
    totalWeight += 30;
    if (candidateId === fingerprint.id) {
      totalScore += 30;
    } else {
      totalScore += 0;
    }
  }

  // 2. Attributes Match (Weight: 25)
  const fpAttrKeys = Object.keys(fingerprint.attributes);
  if (fpAttrKeys.length > 0) {
    totalWeight += 25;
    let attrMatchCount = 0;
    for (const key of fpAttrKeys) {
      const candidateVal = candidate.getAttribute(key);
      if (candidateVal === fingerprint.attributes[key]) {
        attrMatchCount++;
      }
    }
    totalScore += 25 * (attrMatchCount / fpAttrKeys.length);
  }

  // 3. DOM Path LCS Match (Weight: 20)
  if (fingerprint.domPath && fingerprint.domPath.length > 0) {
    totalWeight += 20;
    const candFp = captureFingerprint(candidate);
    let pathMatchCount = 0;
    const maxLen = Math.min(candFp.domPath.length, fingerprint.domPath.length);
    for (let i = 0; i < maxLen; i++) {
      const p1 = candFp.domPath[i];
      const p2 = fingerprint.domPath[i];
      if (p1.tagName === p2.tagName) {
        pathMatchCount += 0.6;
        if (p1.nthOfType === p2.nthOfType) pathMatchCount += 0.4;
      }
    }
    totalScore += 20 * (pathMatchCount / (maxLen || 1));
  }

  // 4. Text Similarity (Weight: 15)
  if (fingerprint.textContent) {
    totalWeight += 15;
    const candText = (candidate.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    const sim = textSimilarity(candText, fingerprint.textContent);
    totalScore += 15 * sim;
  }

  // 5. Sibling / Position Match (Weight: 10)
  if (candidate.parentElement && fingerprint.siblingCount > 0) {
    totalWeight += 10;
    const siblings = Array.from(candidate.parentElement.children);
    const candIndex = siblings.indexOf(candidate);
    const indexDiff = Math.abs(candIndex - fingerprint.siblingIndex);
    const posScore = Math.max(0, 1 - indexDiff / Math.max(1, fingerprint.siblingCount));
    totalScore += 10 * posScore;
  }

  if (totalWeight === 0) return 0.5;
  return totalScore / totalWeight;
}

/**
 * Traverses root (including Shadow DOM piercing) to resolve best element matching Fingerprint.
 */
export function resolveFingerprint(
  fingerprint: ElementFingerprint,
  root: ParentNode = document,
  threshold = 0.55
): { element: Element | null; confidence: number } {
  let bestElement: Element | null = null;
  let maxConfidence = 0;

  // Direct ID shortcut attempt
  if (fingerprint.id) {
    try {
      const el = (root as Document | ShadowRoot).getElementById?.(fingerprint.id) ||
                 root.querySelector?.(`#${escapeCss(fingerprint.id)}`);
      if (el) {
        const score = scoreMatch(el, fingerprint);
        if (score >= threshold) {
          return { element: el, confidence: score };
        }
      }
    } catch (_) {}
  }

  // Direct CSS hint attempt
  if (fingerprint.cssSelectorHint) {
    try {
      const el = root.querySelector?.(fingerprint.cssSelectorHint);
      if (el) {
        const score = scoreMatch(el, fingerprint);
        if (score >= threshold && score > maxConfidence) {
          bestElement = el;
          maxConfidence = score;
        }
      }
    } catch (_) {}
  }

  // Shadow-DOM piercing scan over candidate elements matching tag or attributes
  const candidates: Element[] = [];
  
  function collectCandidates(node: ParentNode) {
    const elems = Array.from(node.querySelectorAll(fingerprint.tagName || '*'));
    for (const el of elems) {
      candidates.push(el);
      if (el.shadowRoot) {
        collectCandidates(el.shadowRoot);
      }
    }
  }

  collectCandidates(root);

  for (const candidate of candidates) {
    const score = scoreMatch(candidate, fingerprint);
    if (score > maxConfidence) {
      maxConfidence = score;
      bestElement = candidate;
    }
  }

  if (maxConfidence >= threshold && bestElement) {
    return { element: bestElement, confidence: maxConfidence };
  }

  return { element: null, confidence: maxConfidence };
}
