/**
 * Page Fingerprint Generator
 * Generates a stable structural fingerprint for the current page based on DOM structure,
 * path signature, interactive element counts, headings, and section landmarks.
 * @module dom/page-fingerprint-generator
 */

export interface PageFingerprint {
  hash: string;
  routePattern: string;
  headingText: string;
  landmarkCount: number;
  interactiveCount: number;
  formCount: number;
}

export class PageFingerprintGenerator {
  generate(url: string, documentRef: Document = document): PageFingerprint {
    const parsed = new URL(url, 'http://localhost');
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const routePattern = '/' + pathParts.map(p => (/^\d+$/.test(p) || /^[0-9a-f-]{36}$/i.test(p) ? ':id' : p)).join('/');

    const h1 = documentRef.querySelector('h1')?.textContent?.trim() || '';
    const h2 = documentRef.querySelector('h2')?.textContent?.trim() || '';
    const headingText = h1 || h2 || documentRef.title || 'Untitled Page';

    const landmarkCount = documentRef.querySelectorAll('header, nav, main, sidebar, footer, form, table').length;
    const interactiveCount = documentRef.querySelectorAll('button, a[href], input, select, textarea, [role="button"]').length;
    const formCount = documentRef.querySelectorAll('form, .k-field, .form-group').length;

    const rawString = `${routePattern}|${headingText.toLowerCase()}|${landmarkCount}|${formCount}`;
    const hash = this.simpleHash(rawString);

    return {
      hash,
      routePattern,
      headingText,
      landmarkCount,
      interactiveCount,
      formCount,
    };
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  }
}
