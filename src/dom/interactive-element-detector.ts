/**
 * Interactive Element Detector
 * Classifies and discovers all meaningful interactive UI controls in the DOM.
 * @module dom/interactive-element-detector
 */

export type SemanticElementType =
  | 'button'
  | 'link'
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'tab'
  | 'menu_item'
  | 'dropdown'
  | 'dialog'
  | 'modal'
  | 'form'
  | 'search_box'
  | 'cta'
  | 'file_upload'
  | 'date_picker'
  | 'toggle'
  | 'custom';

export class InteractiveElementDetector {
  /**
   * Tests whether an element is an interactive control that users perform actions on.
   */
  isInteractive(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return false;

    const tag = element.tagName.toLowerCase();
    if (tag === 'button' || tag === 'select' || tag === 'textarea') return true;
    if (tag === 'a' && element.hasAttribute('href')) return true;
    if (tag === 'input') {
      const type = (element as HTMLInputElement).type.toLowerCase();
      return type !== 'hidden';
    }

    const role = element.getAttribute('role')?.toLowerCase();
    if (role && ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option', 'switch', 'searchbox', 'combobox'].includes(role)) {
      return true;
    }

    if (element.hasAttribute('onclick') || element.hasAttribute('ng-click') || element.hasAttribute('@click') || element.hasAttribute('v-on:click')) {
      return true;
    }

    if (element.getAttribute('tabindex') === '0' || element.classList.contains('btn') || element.classList.contains('button') || element.classList.contains('clickable')) {
      return true;
    }

    return false;
  }

  /**
   * Classifies the semantic element type.
   */
  detectType(element: Element): SemanticElementType {
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role')?.toLowerCase();

    if (tag === 'form' || role === 'form') return 'form';
    if (tag === 'dialog' || role === 'dialog') return 'dialog';

    if (tag === 'input') {
      const type = (element as HTMLInputElement).type.toLowerCase();
      if (type === 'search' || element.id.includes('search') || element.className.includes('search')) return 'search_box';
      if (type === 'file') return 'file_upload';
      if (type === 'date' || type === 'datetime-local') return 'date_picker';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
      return 'input';
    }

    if (tag === 'textarea') return 'textarea';
    if (tag === 'select' || role === 'combobox') return 'select';
    if (tag === 'button' || role === 'button') return 'button';
    if (tag === 'a' || role === 'link') return 'link';

    if (role === 'tab') return 'tab';
    if (role === 'menuitem' || role === 'option') return 'menu_item';
    if (role === 'switch') return 'toggle';

    if (element.classList.contains('modal') || element.classList.contains('modal-box') || element.classList.contains('dialog')) {
      return 'modal';
    }

    if (element.classList.contains('cta') || element.classList.contains('btn-primary')) {
      return 'cta';
    }

    return 'custom';
  }
}
