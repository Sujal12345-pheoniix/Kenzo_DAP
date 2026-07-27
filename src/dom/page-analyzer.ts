/**
 * Page Analyzer
 * Analyzes the current page DOM structure into a structured PageModel
 * containing Identity, Route, Title, Fingerprint, Sections, Forms, and Interactive Elements.
 * @module dom/page-analyzer
 */

import { ElementMetadataExtractor, ElementSemanticMetadata } from '@/dom/element-metadata-extractor';
import { PageFingerprint, PageFingerprintGenerator } from '@/dom/page-fingerprint-generator';
import { PIIRedactor } from '@/dom/pii-redactor';

export interface PageSectionModel {
  id: string;
  type: string;
  elementCount: number;
  headings: string[];
}

export interface FormModel {
  id: string;
  action: string | null;
  inputsCount: number;
  fieldNames: string[];
}

export interface PageModel {
  url: string;
  title: string;
  pathname: string;
  fingerprint: PageFingerprint;
  sections: PageSectionModel[];
  forms: FormModel[];
  elements: ElementSemanticMetadata[];
  scannedAt: string;
}

export class PageAnalyzer {
  private extractor: ElementMetadataExtractor;
  private fingerprintGen: PageFingerprintGenerator;
  private redactor: PIIRedactor;

  constructor() {
    this.redactor = new PIIRedactor();
    this.extractor = new ElementMetadataExtractor(this.redactor);
    this.fingerprintGen = new PageFingerprintGenerator();
  }

  analyze(url: string = window.location.href, root: Element = document.body): PageModel {
    const title = this.redactor.sanitizeText(document.title || 'Untitled Page');
    const pathname = window.location.pathname;
    const fingerprint = this.fingerprintGen.generate(url);

    const elements: ElementSemanticMetadata[] = [];
    const candidates = root.querySelectorAll('button, a[href], input, select, textarea, form, table, [role], [tabindex], .btn, .card');

    // Scan with budget limit to prevent main thread blocking (max 150 meaningful elements per scan)
    let scanned = 0;
    for (let i = 0; i < candidates.length && scanned < 150; i++) {
      const el = candidates[i];
      const meta = this.extractor.extract(el);
      if (meta) {
        elements.push(meta);
        scanned++;
      }
    }

    const sections = this.analyzeSections(root);
    const forms = this.analyzeForms(root);

    return {
      url,
      title,
      pathname,
      fingerprint,
      sections,
      forms,
      elements,
      scannedAt: new Date().toISOString(),
    };
  }

  private analyzeSections(root: Element): PageSectionModel[] {
    const sections: PageSectionModel[] = [];
    const landmarks = root.querySelectorAll('header, nav, main, sidebar, footer, form, table, .panel, .card');

    landmarks.forEach((el, idx) => {
      if (this.redactor.shouldIgnore(el)) return;
      const type = el.tagName.toLowerCase();
      const headings = Array.from(el.querySelectorAll('h1, h2, h3, h4'))
        .map(h => this.redactor.sanitizeText(h.textContent || ''))
        .filter(Boolean);

      sections.push({
        id: el.id || `sec_${type}_${idx}`,
        type,
        elementCount: el.querySelectorAll('*').length,
        headings,
      });
    });

    return sections;
  }

  private analyzeForms(root: Element): FormModel[] {
    const forms: FormModel[] = [];
    const formEls = root.querySelectorAll('form');

    formEls.forEach((el, idx) => {
      if (this.redactor.shouldIgnore(el)) return;
      const inputs = el.querySelectorAll('input, select, textarea');
      const fieldNames = Array.from(inputs)
        .map(inp => inp.getAttribute('name') || inp.id || (inp as HTMLInputElement).placeholder || '')
        .filter(Boolean);

      forms.push({
        id: el.id || `form_${idx}`,
        action: el.getAttribute('action') || null,
        inputsCount: inputs.length,
        fieldNames,
      });
    });

    return forms;
  }
}
