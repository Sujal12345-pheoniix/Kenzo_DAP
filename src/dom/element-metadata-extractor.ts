/**
 * Element Metadata Extractor
 * Extracts rich, structured semantic metadata for elements matching Section 4 specification.
 * @module dom/element-metadata-extractor
 */

import { AccessibilityAnalyzer } from '@/dom/accessibility-analyzer';
import { InteractiveElementDetector, SemanticElementType } from '@/dom/interactive-element-detector';
import { PIIRedactor } from '@/dom/pii-redactor';
import { VisibilityChecker } from '@/dom/visibility-checker';

export interface ElementSemanticMetadata {
  elementId: string;
  tag: string;
  role: string;
  semanticType: SemanticElementType;
  text: string;
  accessibleName: string;
  ariaLabel: string | null;
  placeholder: string | null;
  name: string | null;
  type: string | null;
  href: string | null;
  classes: string[];
  stableAttributes: Record<string, string>;
  dataAttributes: Record<string, string>;
  parentContext: string;
  nearbyText: string;
  section: string;
  formContext: string | null;
  boundingBox: { top: number; left: number; width: number; height: number };
  visibility: { isVisible: boolean; opacity: number };
  interactivity: boolean;
  selectorCandidates: Array<{ strategy: string; value: string; confidence: number }>;
  confidence: number;
}

export class ElementMetadataExtractor {
  private accessibilityAnalyzer = new AccessibilityAnalyzer();
  private detector = new InteractiveElementDetector();
  private visibilityChecker = new VisibilityChecker();

  constructor(private piiRedactor: PIIRedactor = new PIIRedactor()) {}

  extract(element: Element): ElementSemanticMetadata | null {
    if (this.piiRedactor.shouldIgnore(element)) {
      return null;
    }

    const tag = element.tagName.toLowerCase();
    const isVisible = this.visibilityChecker.isVisible(element);
    if (!isVisible) return null;

    const opacity = this.visibilityChecker.getEffectiveOpacity(element);
    const rect = element.getBoundingClientRect();
    const acc = this.accessibilityAnalyzer.getMetadata(element);
    const semanticType = this.detector.detectType(element);
    const isInteractive = this.detector.isInteractive(element);

    const rawText = element.textContent?.trim() || '';
    const text = this.piiRedactor.getElementLabel(element, rawText);

    const placeholder = element.getAttribute('placeholder');
    const name = element.getAttribute('name');
    const type = element.getAttribute('type');
    const href = element.getAttribute('href');

    const classes = Array.from(element.classList).filter(c => !c.startsWith('kenzo-'));
    const dataAttributes: Record<string, string> = {};
    const stableAttributes: Record<string, string> = {};

    if (element.id) stableAttributes.id = element.id;
    if (name) stableAttributes.name = name;

    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') && !attr.name.startsWith('data-kenzo')) {
        dataAttributes[attr.name.replace('data-', '')] = attr.value;
      }
    });

    const parent = element.parentElement;
    const parentContext = parent ? `${parent.tagName.toLowerCase()}${parent.id ? '#' + parent.id : ''}` : 'root';

    const sectionEl = element.closest('header, nav, main, sidebar, footer, form, table, [role="region"], .panel, .card');
    const section = sectionEl ? (sectionEl.id ? `#${sectionEl.id}` : sectionEl.tagName.toLowerCase()) : 'page';

    const formEl = element.closest('form');
    const formContext = formEl ? (formEl.id ? `#${formEl.id}` : 'form') : null;

    const nearbyText = this.extractNearbyText(element);
    const selectorCandidates = this.generateCandidates(element, acc.accessibleName, text);

    let confidence = 0.5;
    if (element.id && !/\d{5,}/.test(element.id)) confidence += 0.4;
    else if (acc.accessibleName) confidence += 0.3;
    else if (selectorCandidates.length > 0) confidence += 0.2;

    const elementId = element.id || `el_${Math.random().toString(36).substring(2, 9)}`;

    return {
      elementId,
      tag,
      role: acc.role,
      semanticType,
      text,
      accessibleName: acc.accessibleName,
      ariaLabel: acc.ariaLabel,
      placeholder,
      name,
      type,
      href,
      classes,
      stableAttributes,
      dataAttributes,
      parentContext,
      nearbyText,
      section,
      formContext,
      boundingBox: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      visibility: { isVisible, opacity },
      interactivity: isInteractive,
      selectorCandidates,
      confidence: Math.min(1.0, confidence),
    };
  }

  private extractNearbyText(element: Element): string {
    const parent = element.parentElement;
    if (!parent) return '';
    const text = parent.textContent?.replace(element.textContent || '', '').trim() || '';
    return text.substring(0, 60);
  }

  private generateCandidates(element: Element, accName: string, text: string): Array<{ strategy: string; value: string; confidence: number }> {
    const candidates: Array<{ strategy: string; value: string; confidence: number }> = [];

    if (element.id && !/\d{5,}/.test(element.id)) {
      candidates.push({ strategy: 'id', value: `#${CSS.escape(element.id)}`, confidence: 0.95 });
    }

    Array.from(element.attributes).forEach(attr => {
      if (['data-testid', 'data-test', 'data-qa', 'data-cy'].includes(attr.name)) {
        candidates.push({ strategy: 'test-id', value: `[${attr.name}="${CSS.escape(attr.value)}"]`, confidence: 0.9 });
      }
    });

    if (element.getAttribute('aria-label')) {
      candidates.push({ strategy: 'aria-label', value: `[aria-label="${CSS.escape(element.getAttribute('aria-label')!)}"]`, confidence: 0.85 });
    }

    if (element.getAttribute('name')) {
      candidates.push({ strategy: 'name', value: `[name="${CSS.escape(element.getAttribute('name')!)}"]`, confidence: 0.8 });
    }

    if (accName) {
      candidates.push({ strategy: 'accessible-name', value: `${element.tagName.toLowerCase()}:has-text("${accName.substring(0, 30)}")`, confidence: 0.75 });
    }

    if (text && text.length > 2 && text.length < 40) {
      candidates.push({ strategy: 'text-content', value: `${element.tagName.toLowerCase()}:contains("${text}")`, confidence: 0.7 });
    }

    return candidates;
  }
}
