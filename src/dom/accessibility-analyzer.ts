/**
 * Accessibility Analyzer
 * Computes ARIA roles, accessible names, and interactive accessibility metadata.
 * @module dom/accessibility-analyzer
 */

export interface AccessibilityMetadata {
  role: string;
  accessibleName: string;
  ariaLabel: string | null;
  ariaDescribedBy: string | null;
  ariaExpanded: boolean | null;
  ariaDisabled: boolean | null;
  tabIndex: number;
}

export class AccessibilityAnalyzer {
  getMetadata(element: Element): AccessibilityMetadata {
    const role = this.computeRole(element);
    const ariaLabel = element.getAttribute('aria-label');
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    const ariaExpanded = element.hasAttribute('aria-expanded') ? element.getAttribute('aria-expanded') === 'true' : null;
    const ariaDisabled = element.hasAttribute('aria-disabled') ? element.getAttribute('aria-disabled') === 'true' : null;
    const tabIndex = element instanceof HTMLElement ? element.tabIndex : -1;
    const accessibleName = this.computeAccessibleName(element, ariaLabel);

    return {
      role,
      accessibleName,
      ariaLabel,
      ariaDescribedBy,
      ariaExpanded,
      ariaDisabled,
      tabIndex,
    };
  }

  computeRole(element: Element): string {
    const explicitRole = element.getAttribute('role');
    if (explicitRole) return explicitRole.toLowerCase();

    const tag = element.tagName.toLowerCase();
    switch (tag) {
      case 'button': return 'button';
      case 'a': return element.hasAttribute('href') ? 'link' : 'generic';
      case 'input': {
        const type = (element as HTMLInputElement).type.toLowerCase();
        if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        if (type === 'search') return 'searchbox';
        return 'textbox';
      }
      case 'select': return 'combobox';
      case 'textarea': return 'textbox';
      case 'form': return 'form';
      case 'table': return 'table';
      case 'nav': return 'navigation';
      case 'header': return 'banner';
      case 'footer': return 'contentinfo';
      case 'aside': return 'complementary';
      case 'main': return 'main';
      case 'dialog': return 'dialog';
      default: return 'generic';
    }
  }

  computeAccessibleName(element: Element, ariaLabelOverride?: string | null): string {
    const ariaLabel = ariaLabelOverride ?? element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }

    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const parts = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim()).filter(Boolean);
      if (parts.length > 0) return parts.join(' ');
    }

    if (element instanceof HTMLInputElement) {
      if (element.placeholder) return element.placeholder.trim();
      if (element.value && element.type !== 'password') return element.value.trim();
      if (element.id) {
        const labelEl = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (labelEl && labelEl.textContent) return labelEl.textContent.trim();
      }
    }

    const title = element.getAttribute('title');
    if (title && title.trim()) return title.trim();

    const alt = element.getAttribute('alt');
    if (alt && alt.trim()) return alt.trim();

    const textContent = element.textContent?.trim() || '';
    if (textContent.length > 0 && textContent.length < 100) {
      return textContent.replace(/\s+/g, ' ');
    }

    return '';
  }
}
