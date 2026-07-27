/**
 * Visual Flow Builder Overlay.
 * Allows pointing and clicking DOM elements to build walkthrough steps on any page.
 */
export class BuilderOverlay {
  private active = false;
  private inspecting = false;
  private recording = false;
  private hoverOverlay: HTMLElement | null = null;
  private builderContainer: HTMLElement | null = null;
  private recordListener: ((e: MouseEvent) => void) | null = null;
  
  // State for the flow being edited
  private flowName = 'New Onboarding Tour';
  private flowDescription = 'Created via visual builder';
  private steps: Array<{
    title: string;
    content: string;
    selector: { css: string };
    placement: string;
    displayMode: string;
  }> = [];

  constructor(
    private readonly apiBaseUrl: string,
    private readonly apiKey: string
  ) {
    this.setupTrigger();
  }

  private setupTrigger(): void {
    // Check if query param ?kenzo_builder=true is set
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('kenzo_builder') === 'true') {
        this.activate();
      }

      // Add hotkey trigger: Ctrl+Shift+K
      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'K') {
          e.preventDefault();
          if (this.active) {
            this.deactivate();
          } else {
            this.activate();
          }
        }
      });
    }
  }

  public activate(): void {
    if (this.active) return;
    this.active = true;
    console.log('[Kenzo Builder] Visual Flow Builder Activated');
    this.injectStyles();
    this.renderBuilderUI();
    this.createHoverOverlay();
  }

  public deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.inspecting = false;
    this.removeBuilderUI();
    this.removeHoverOverlay();
    console.log('[Kenzo Builder] Visual Flow Builder Deactivated');
  }

  private injectStyles(): void {
    const STYLES_ID = 'kenzo-builder-styles';
    if (document.getElementById(STYLES_ID)) return;

    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = `
      #kenzo-builder-root {
        position: fixed;
        top: 0;
        right: 0;
        width: 380px;
        height: 100vh;
        background: rgba(15, 17, 26, 0.95);
        backdrop-filter: blur(16px);
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        color: #f1f1f1;
        font-family: -apple-system, BlinkMacSystemFont, 'Outfit', 'Segoe UI', Roboto, sans-serif;
        box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .k-builder-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 15px;
        margin-bottom: 15px;
      }

      .k-builder-header h2 {
        margin: 0;
        font-size: 1.25rem;
        background: linear-gradient(135deg, #a5b4fc, #6366f1);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .k-builder-close {
        background: transparent;
        border: none;
        color: #888;
        font-size: 1.5rem;
        cursor: pointer;
        transition: color 0.2s;
      }
      
      .k-builder-close:hover {
        color: #ff5f56;
      }

      .k-field {
        margin-bottom: 12px;
      }

      .k-field label {
        display: block;
        font-size: 0.75rem;
        text-transform: uppercase;
        color: #888;
        margin-bottom: 4px;
        letter-spacing: 0.05em;
      }

      .k-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 8px 12px;
        color: #fff;
        box-sizing: border-box;
        font-size: 0.875rem;
        outline: none;
        transition: border-color 0.2s;
      }

      .k-input:focus {
        border-color: #6366f1;
      }

      .k-btn {
        background: #6366f1;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 10px 16px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        margin-top: 10px;
      }

      .k-btn:hover {
        background: #4f46e5;
        transform: translateY(-1px);
      }

      .k-btn--secondary {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .k-btn--secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .k-btn--danger {
        background: #ef4444;
      }
      .k-btn--danger:hover {
        background: #dc2626;
      }

      .k-steps-list {
        flex: 1;
        overflow-y: auto;
        border: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(255, 255, 255, 0.02);
        border-radius: 6px;
        padding: 10px;
        margin: 15px 0;
      }

      .k-step-item {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 10px;
        margin-bottom: 8px;
        position: relative;
        font-size: 0.875rem;
      }

      .k-step-item-title {
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
      }

      .k-step-item-selector {
        font-family: monospace;
        font-size: 0.75rem;
        color: #a5b4fc;
        background: rgba(99, 102, 241, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        word-break: break-all;
        display: inline-block;
      }

      .k-step-delete {
        position: absolute;
        top: 10px;
        right: 10px;
        background: transparent;
        border: none;
        color: #888;
        cursor: pointer;
      }

      .k-step-delete:hover {
        color: #ef4444;
      }

      .k-no-steps {
        text-align: center;
        color: #666;
        padding: 40px 20px;
        font-size: 0.875rem;
      }

      /* Inspector Hover Border */
      #kenzo-builder-hover-overlay {
        position: absolute;
        border: 2px dashed #6366f1;
        background: rgba(99, 102, 241, 0.15);
        pointer-events: none;
        z-index: 999998;
        transition: all 0.05s ease-out;
        display: none;
        box-sizing: border-box;
      }

      /* Inspector Status Bar */
      .k-inspecting-banner {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #6366f1;
        color: white;
        padding: 10px 20px;
        border-radius: 9999px;
        font-weight: 600;
        z-index: 999997;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: k-pulse 2s infinite;
      }

      @keyframes k-pulse {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.02); }
      }
    `;
    document.head.appendChild(style);
  }

  private createHoverOverlay(): void {
    if (document.getElementById('kenzo-builder-hover-overlay')) return;
    this.hoverOverlay = document.createElement('div');
    this.hoverOverlay.id = 'kenzo-builder-hover-overlay';
    document.body.appendChild(this.hoverOverlay);
  }

  private removeHoverOverlay(): void {
    const el = document.getElementById('kenzo-builder-hover-overlay');
    el?.remove();
    this.hoverOverlay = null;
  }

  private renderBuilderUI(): void {
    this.removeBuilderUI();

    this.builderContainer = document.createElement('div');
    this.builderContainer.id = 'kenzo-builder-root';
    this.builderContainer.innerHTML = `
      <div class="k-builder-header">
        <h2>Kenzo Flow Builder</h2>
        <button class="k-builder-close" id="k-close-btn" title="Close Panel">&times;</button>
      </div>
      <div class="k-field">
        <label>Tour Name</label>
        <input type="text" class="k-input" id="k-flow-name" value="${this.flowName}">
      </div>
      <div class="k-field">
        <label>Description</label>
        <input type="text" class="k-input" id="k-flow-desc" value="${this.flowDescription}">
      </div>
      
      <div style="font-weight: 600; font-size: 0.8rem; text-transform: uppercase; color: #888; margin-top: 15px;">Steps</div>
      <div class="k-steps-list" id="k-steps-container">
        <!-- Steps rendered here -->
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button class="k-btn" id="k-add-step-btn">+ Add Walkthrough Step</button>
        <button class="k-btn k-btn--secondary" id="k-record-btn">🔴 Start Workflow Recording</button>
        <button class="k-btn k-btn--secondary" id="k-save-btn">Save & Publish Tour</button>
        <button class="k-btn k-btn--secondary k-btn--danger" id="k-clear-btn">Clear All</button>
      </div>
    `;

    document.body.appendChild(this.builderContainer);
    this.renderStepsList();
    this.bindBuilderEvents();
  }

  private removeBuilderUI(): void {
    const el = document.getElementById('kenzo-builder-root');
    el?.remove();
    this.builderContainer = null;
    this.stopInspecting();
  }

  private renderStepsList(): void {
    const container = document.getElementById('k-steps-container');
    if (!container) return;

    if (this.steps.length === 0) {
      container.innerHTML = `<div class="k-no-steps">No steps added yet. Click "+ Add Walkthrough Step" to define steps.</div>`;
      return;
    }

    container.innerHTML = this.steps
      .map((step, idx) => `
        <div class="k-step-item">
          <div class="k-step-item-title">${idx + 1}. ${step.title || 'Step'}</div>
          <div class="k-step-item-selector">${step.selector.css}</div>
          <button class="k-step-delete" data-index="${idx}" title="Delete step">&times;</button>
        </div>
      `)
      .join('');

    // Bind deletes
    container.querySelectorAll('.k-step-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0');
        this.steps.splice(idx, 1);
        this.renderStepsList();
      });
    });
  }

  private bindBuilderEvents(): void {
    const closeBtn = document.getElementById('k-close-btn');
    closeBtn?.addEventListener('click', () => this.deactivate());

    const nameInput = document.getElementById('k-flow-name') as HTMLInputElement;
    nameInput?.addEventListener('input', () => {
      this.flowName = nameInput.value;
    });

    const descInput = document.getElementById('k-flow-desc') as HTMLInputElement;
    descInput?.addEventListener('input', () => {
      this.flowDescription = descInput.value;
    });

    const addStepBtn = document.getElementById('k-add-step-btn');
    addStepBtn?.addEventListener('click', () => this.startInspecting());

    const recordBtn = document.getElementById('k-record-btn');
    recordBtn?.addEventListener('click', () => this.toggleRecording());

    const saveBtn = document.getElementById('k-save-btn');
    saveBtn?.addEventListener('click', () => this.saveTourToDb());

    const clearBtn = document.getElementById('k-clear-btn');
    clearBtn?.addEventListener('click', () => {
      this.steps = [];
      this.renderStepsList();
    });
  }

  // --- Cross-Page Workflow Recorder ---

  private toggleRecording(): void {
    if (this.recording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  private startRecording(): void {
    if (this.recording) return;
    this.recording = true;
    const recordBtn = document.getElementById('k-record-btn');
    if (recordBtn) {
      recordBtn.textContent = '⏹️ Stop Recording';
      recordBtn.style.background = '#ef4444';
      recordBtn.style.color = '#ffffff';
    }

    const banner = document.createElement('div');
    banner.id = 'kenzo-builder-record-banner';
    banner.className = 'k-inspecting-banner';
    banner.style.background = '#ef4444';
    banner.innerHTML = `
      <span>🔴 Recording Workflow Actions... Click elements naturally</span>
      <button style="background:transparent; border:1px solid #fff; color:#fff; border-radius:4px; padding:2px 8px; cursor:pointer;" id="k-stop-record">Stop</button>
    `;
    document.body.appendChild(banner);
    document.getElementById('k-stop-record')?.addEventListener('click', () => this.stopRecording());

    this.recordListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest('#kenzo-builder-root, #kenzo-builder-record-banner, [data-kenzo-overlay]')) return;

      // Extract label and selector
      const { PIIRedactor } = require('@/dom/pii-redactor');
      const redactor = new PIIRedactor();
      if (redactor.shouldIgnore(target)) return;

      const rawLabel = target.textContent?.trim() || target.getAttribute('aria-label') || (target as HTMLInputElement).placeholder || target.tagName.toLowerCase();
      const cleanLabel = redactor.sanitizeText(rawLabel, target);

      const { StableSelectorGenerator } = require('@/dom/stable-selector-generator');
      const gen = new StableSelectorGenerator();
      const candidates = gen.generateCandidates(target);
      const bestSelector = candidates[0]?.value || (target.id ? `#${target.id}` : target.tagName.toLowerCase());

      this.steps.push({
        title: `Click "${cleanLabel.substring(0, 30)}"`,
        content: `Click the <strong>${cleanLabel}</strong> element to continue.`,
        selector: { css: bestSelector },
        placement: 'bottom',
        displayMode: 'spotlight',
      });

      this.renderStepsList();
    };

    document.addEventListener('click', this.recordListener, true);
  }

  private stopRecording(): void {
    if (!this.recording) return;
    this.recording = false;
    if (this.recordListener) {
      document.removeEventListener('click', this.recordListener, true);
      this.recordListener = null;
    }

    document.getElementById('kenzo-builder-record-banner')?.remove();
    const recordBtn = document.getElementById('k-record-btn');
    if (recordBtn) {
      recordBtn.textContent = '🔴 Start Workflow Recording';
      recordBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      recordBtn.style.color = '#ffffff';
    }
  }

  // --- Point & Click Element Inspector ---

  private startInspecting(): void {
    if (this.inspecting) return;
    this.inspecting = true;

    // Show inspecting banner
    const banner = document.createElement('div');
    banner.id = 'kenzo-builder-inspect-banner';
    banner.className = 'k-inspecting-banner';
    banner.innerHTML = `
      <span>🔍 Hover & Click an element on the page</span>
      <button style="background:transparent; border:1px solid #fff; color:#fff; border-radius:4px; padding:2px 8px; cursor:pointer;" id="k-cancel-inspect">Cancel</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('k-cancel-inspect')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.stopInspecting();
    });

    // Minimize builder side panel while inspecting
    if (this.builderContainer) {
      this.builderContainer.style.opacity = '0.15';
      this.builderContainer.style.pointerEvents = 'none';
    }

    // Add listeners
    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('mouseout', this.handleMouseOut, true);
    document.addEventListener('click', this.handleElementClick, true);
  }

  private stopInspecting(): void {
    this.inspecting = false;
    document.getElementById('kenzo-builder-inspect-banner')?.remove();

    if (this.builderContainer) {
      this.builderContainer.style.opacity = '1';
      this.builderContainer.style.pointerEvents = 'auto';
    }

    if (this.hoverOverlay) {
      this.hoverOverlay.style.display = 'none';
    }

    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('mouseout', this.handleMouseOut, true);
    document.removeEventListener('click', this.handleElementClick, true);
  }

  private handleMouseOver = (e: MouseEvent): void => {
    const el = e.target as HTMLElement;
    if (!el || this.isBuilderOwnElement(el)) return;

    const rect = el.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    if (this.hoverOverlay) {
      this.hoverOverlay.style.top = `${rect.top + scrollTop}px`;
      this.hoverOverlay.style.left = `${rect.left + scrollLeft}px`;
      this.hoverOverlay.style.width = `${rect.width}px`;
      this.hoverOverlay.style.height = `${rect.height}px`;
      this.hoverOverlay.style.display = 'block';
    }
  };

  private handleMouseOut = (_e: MouseEvent): void => {
    if (this.hoverOverlay) {
      this.hoverOverlay.style.display = 'none';
    }
  };

  private handleElementClick = (e: MouseEvent): void => {
    const el = e.target as HTMLElement;
    if (!el || this.isBuilderOwnElement(el)) return;

    e.preventDefault();
    e.stopPropagation();

    const selector = this.generateCssSelector(el);
    this.stopInspecting();

    // Show step input modal
    this.promptStepDetails(selector);
  };

  private isBuilderOwnElement(el: HTMLElement): boolean {
    return !!(
      el.closest('#kenzo-builder-root') ||
      el.closest('#kenzo-builder-hover-overlay') ||
      el.closest('#kenzo-builder-inspect-banner') ||
      el.closest('.k-prompt-modal-overlay')
    );
  }

  // Generate selector path
  private generateCssSelector(el: HTMLElement): string {
    if (el.id) {
      return `#${el.id}`;
    }

    // Check for test tags
    const testAttrs = ['data-testid', 'data-cy', 'data-qa'];
    for (const attr of testAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        return `[${attr}="${val}"]`;
      }
    }

    const parts: string[] = [];
    let current: HTMLElement | null = el;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      
      if (current.className) {
        // split by space and take first class for simpler selector path
        const firstClass = current.className.split(/\s+/)[0];
        if (firstClass && !firstClass.startsWith('k-') && !firstClass.startsWith('kenzo-')) {
          selector += `.${firstClass}`;
        }
      }

      // Check siblings for index if not unique tag
      const parentEl: HTMLElement | null = current.parentElement;
      if (parentEl) {
        const siblings = (Array.from(parentEl.children) as Element[]).filter(
          (c) => c.nodeName === current!.nodeName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(selector);
      current = parentEl;
      
      // Stop traversing up if we hit body, html or id
      if (current?.nodeName.toLowerCase() === 'body' || current?.id) {
        if (current?.id) {
          parts.unshift(`#${current.id}`);
        } else {
          parts.unshift('body');
        }
        break;
      }
    }

    return parts.join(' > ');
  }

  // Floating prompt modal for adding step content
  private promptStepDetails(selector: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'k-prompt-modal-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000000;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background: #15171a; color: #fff; padding: 24px; border-radius: 8px; width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, sans-serif;';

    modal.innerHTML = `
      <h3 style="margin-top:0; color:#a5b4fc; margin-bottom:15px; font-size:1.1rem;">Configure Step Tooltip</h3>
      <div style="font-size:0.75rem; color:#888; font-family:monospace; margin-bottom:15px; background:rgba(255,255,255,0.03); padding:6px; border-radius:4px; word-break:break-all;">
        Selector: ${selector}
      </div>
      <div class="k-field">
        <label>Tooltip Title</label>
        <input type="text" class="k-input" id="k-step-title" placeholder="e.g., Click this button">
      </div>
      <div class="k-field">
        <label>Tooltip Content</label>
        <textarea class="k-input" id="k-step-content" rows="3" placeholder="Explain what the user should do..."></textarea>
      </div>
      <div class="k-field">
        <label>Placement</label>
        <select class="k-input" id="k-step-placement">
          <option value="auto">Auto</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div style="display:flex; gap:10px; margin-top:15px;">
        <button class="k-btn k-btn--secondary" id="k-prompt-cancel" style="margin:0;">Cancel</button>
        <button class="k-btn" id="k-prompt-save" style="margin:0;">Add Step</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus title field
    document.getElementById('k-step-title')?.focus();

    document.getElementById('k-prompt-cancel')?.addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('k-prompt-save')?.addEventListener('click', () => {
      const title = (document.getElementById('k-step-title') as HTMLInputElement).value || 'Onboarding Step';
      const content = (document.getElementById('k-step-content') as HTMLTextAreaElement).value || '';
      const placement = (document.getElementById('k-step-placement') as HTMLSelectElement).value || 'auto';

      this.steps.push({
        title,
        content,
        selector: { css: selector },
        placement,
        displayMode: 'tooltip', // default display mode
      });

      overlay.remove();
      this.renderStepsList();
    });
  }

  // --- API Integrations ---

  private async saveTourToDb(): Promise<void> {
    if (this.steps.length === 0) {
      alert('[Kenzo Builder] Please add at least one step before saving.');
      return;
    }

    const saveBtn = document.getElementById('k-save-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      // 1. Create the flow as published
      const flowResponse = await fetch(`${this.apiBaseUrl}/admin/flows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey, // Authenticate admin endpoints
        },
        body: JSON.stringify({
          name: this.flowName,
          description: this.flowDescription,
          status: 'published',
          priority: 1,
          urlRules: [{ type: 'contains', pattern: window.location.pathname, matchFullUrl: false }] // Auto match current route
        })
      });

      if (!flowResponse.ok) {
        throw new Error('Failed to create flow record on server');
      }

      const flow = await flowResponse.json();

      // 2. Synchronize all the steps
      const stepsResponse = await fetch(`${this.apiBaseUrl}/admin/flows/${flow.id}/steps/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({ steps: this.steps })
      });

      if (!stepsResponse.ok) {
        throw new Error('Failed to sync flow steps on server');
      }

      alert(`[Kenzo Builder] Walkthrough "${this.flowName}" published successfully with ${this.steps.length} steps!`);
      this.deactivate();

      // Auto-reload current page to launch it immediately
      window.location.reload();
      
    } catch (err: any) {
      console.error('[Kenzo Builder] Save error:', err);
      alert(`[Kenzo Builder] Error saving flow: ${err.message}`);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save & Publish Tour';
      }
    }
  }
}
