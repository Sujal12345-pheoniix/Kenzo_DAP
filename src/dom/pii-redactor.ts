/**
 * Privacy-First PII Redactor
 * Ensures sensitive data (passwords, credit cards, SSNs, tokens, PII) are redacted
 * before any page model or DOM metadata is stored or transmitted to backend services.
 * @module dom/pii-redactor
 */

const SENSITIVE_INPUT_TYPES = new Set(['password', 'credit-card', 'card-number', 'cvv', 'ssn', 'secret', 'token']);
const SENSITIVE_NAME_PATTERNS = /password|passcode|secret|token|ssn|social_security|creditcard|cardnumber|cvv|cvc|bank|account_number|otp|auth/i;

export interface PIIRedactionOptions {
  maskAllInputs?: boolean;
  ignoredSelectors?: string[];
  maskedSelectors?: string[];
}

export class PIIRedactor {
  private options: PIIRedactionOptions;

  constructor(options: PIIRedactionOptions = {}) {
    this.options = options;
  }

  /**
   * Determines if an element should be completely ignored during DOM scanning.
   */
  shouldIgnore(element: Element): boolean {
    if (element.hasAttribute('data-kenzo-ignore')) return true;
    if (element.closest('[data-kenzo-ignore]')) return true;
    if (element.closest('[data-kenzo-overlay]')) return true;
    if (element.closest('#kenzo-backdrop, #kenzo-spotlight, #kenzo-tooltip, #ken-launcher-widget, #kenzo-builder-overlay')) return true;

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || tagName === 'noscript' || tagName === 'template') {
      return true;
    }

    if (this.options.ignoredSelectors) {
      for (const sel of this.options.ignoredSelectors) {
        try {
          if (element.matches(sel) || element.closest(sel)) return true;
        } catch (_) {}
      }
    }

    return false;
  }

  /**
   * Determines if element text or values must be masked due to privacy policy or annotations.
   */
  shouldMask(element: Element): boolean {
    if (element.hasAttribute('data-kenzo-mask')) return true;
    if (element.closest('[data-kenzo-mask]')) return true;

    if (element instanceof HTMLInputElement) {
      const type = element.type.toLowerCase();
      if (SENSITIVE_INPUT_TYPES.has(type)) return true;
      if (SENSITIVE_NAME_PATTERNS.test(element.name || '') || SENSITIVE_NAME_PATTERNS.test(element.id || '')) return true;
      if (element.autocomplete && (element.autocomplete.includes('current-password') || element.autocomplete.includes('cc-number'))) return true;
    }

    if (this.options.maskedSelectors) {
      for (const sel of this.options.maskedSelectors) {
        try {
          if (element.matches(sel)) return true;
        } catch (_) {}
      }
    }

    return false;
  }

  /**
   * Sanitizes value or text content of an element.
   */
  sanitizeText(text: string, element?: Element): string {
    if (!text) return '';
    if (element && this.shouldMask(element)) {
      return '••••••••';
    }

    // Mask credit card numbers
    let sanitized = text.replace(/\b(?:\d[ -]*?){13,16}\b/g, '••••-••••-••••-••••');
    // Mask SSN
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '•••-••-••••');
    // Mask email addresses if annotated or configured
    if (element && element.hasAttribute('data-kenzo-mask-email')) {
      sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'u***@***.com');
    }

    return sanitized.trim();
  }

  /**
   * Returns clean text for element, substituting manual label override if data-kenzo-label is present.
   */
  getElementLabel(element: Element, fallbackText: string): string {
    const customLabel = element.getAttribute('data-kenzo-label');
    if (customLabel) return customLabel;
    return this.sanitizeText(fallbackText, element);
  }
}
