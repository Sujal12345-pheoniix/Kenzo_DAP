/**
 * Self Help Widget — slide-over panel with keyword and semantic search over authored content and external KB.
 * Ultra-responsive, glassmorphic UI with vibrant category tags and micro-interactions.
 * @module self-help/self-help-manager
 */

export interface SelfHelpArticle {
  id: string;
  title: string;
  summary: string;
  flowId?: string;
  externalUrl?: string;
  category?: string;
}

export class SelfHelpManager {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private articles: SelfHelpArticle[] = [];
  private isOpen = false;

  constructor(private readonly onLaunchFlow?: (flowId: string) => void) {
    this.initShadowDom();
  }

  private initShadowDom(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('kenzo-self-help-root')) return;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-self-help-root';
    this.shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483400; pointer-events: none;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .self-help-fab {
        position: fixed;
        top: 16px;
        right: 24px;
        bottom: auto;
        pointer-events: auto;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
        color: #e2e8f0;
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 20px;
        padding: 7px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.01em;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 0 12px rgba(99, 102, 241, 0.2);
        display: flex;
        align-items: center;
        gap: 7px;
        z-index: 2147483400;
        backdrop-filter: blur(12px);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .self-help-fab:hover {
        transform: translateY(-1px) scale(1.03);
        border-color: rgba(129, 140, 248, 0.7);
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(49, 46, 129, 0.98) 100%);
        box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
        color: #ffffff;
      }
      .self-help-panel {
        position: fixed;
        top: 0;
        right: -420px;
        width: 380px;
        max-width: 100vw;
        height: 100vh;
        background: rgba(15, 15, 26, 0.96);
        backdrop-filter: blur(16px);
        border-left: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: -15px 0 50px rgba(0, 0, 0, 0.6);
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        z-index: 2147483401;
        transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .self-help-panel.open {
        right: 0;
      }
      .self-help-header {
        padding: 24px 20px 16px 20px;
        background: linear-gradient(180deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 15, 26, 0) 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .self-help-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .self-help-title {
        font-size: 18px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.02em;
      }
      .self-help-close-btn {
        background: rgba(255,255,255,0.06);
        border: none;
        color: #94a3b8;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .self-help-close-btn:hover {
        background: rgba(255,255,255,0.15);
        color: #ffffff;
      }
      .self-help-search-box {
        position: relative;
      }
      .self-help-search-input {
        width: 100%;
        padding: 11px 16px 11px 40px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        color: #ffffff;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }
      .self-help-search-input:focus {
        border-color: #818cf8;
        box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.2);
        background: rgba(255, 255, 255, 0.09);
      }
      .self-help-search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        pointer-events: none;
      }
      .self-help-list {
        padding: 16px 20px;
        overflow-y: auto;
        flex: 1;
      }
      .self-help-card {
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 14px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .self-help-card:hover {
        background: rgba(129, 140, 248, 0.08);
        border-color: rgba(129, 140, 248, 0.3);
        transform: translateY(-1px);
      }
      .self-help-card-category {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 2px 8px;
        border-radius: 6px;
        background: rgba(129, 140, 248, 0.15);
        color: #818cf8;
        margin-bottom: 6px;
      }
      .self-help-card-title {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 4px;
      }
      .self-help-card-summary {
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.5;
      }
    `;

    this.shadowRoot.appendChild(style);

    const fab = document.createElement('button');
    fab.className = 'self-help-fab';
    fab.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      <span>Self Help</span>
    `;

    const panel = document.createElement('div');
    panel.className = 'self-help-panel';
    panel.innerHTML = `
      <div class="self-help-header">
        <div class="self-help-title-row">
          <div class="self-help-title">Help & Knowledge</div>
          <button class="self-help-close-btn">✕</button>
        </div>
        <div class="self-help-search-box">
          <svg class="self-help-search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" class="self-help-search-input" placeholder="Search guides, walkthroughs, FAQs..." />
        </div>
      </div>
      <div class="self-help-list"></div>
    `;

    const togglePanel = (open: boolean) => {
      this.isOpen = open;
      panel.classList.toggle('open', this.isOpen);
    };

    fab.addEventListener('click', () => togglePanel(!this.isOpen));
    panel.querySelector('.self-help-close-btn')?.addEventListener('click', () => togglePanel(false));

    const searchInput = panel.querySelector('.self-help-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      this.renderList(query);
    });

    this.shadowRoot.appendChild(fab);
    this.shadowRoot.appendChild(panel);
    document.body.appendChild(this.shadowHost);
  }

  setArticles(articles: SelfHelpArticle[]): void {
    this.articles = articles;
    this.renderList('');
  }

  private renderList(query: string): void {
    if (!this.shadowRoot) return;
    const listEl = this.shadowRoot.querySelector('.self-help-list');
    if (!listEl) return;

    const filtered = this.articles.filter((art) => {
      if (!query) return true;
      return art.title.toLowerCase().includes(query) || art.summary.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; color:#64748b; font-size: 13px; padding: 40px 20px;">No matching articles found</div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (art) => `
      <div class="self-help-card" data-flow-id="${art.flowId || ''}" data-url="${art.externalUrl || ''}">
        <span class="self-help-card-category">${art.category || (art.flowId ? 'Interactive Tour' : 'Article')}</span>
        <div class="self-help-card-title">${art.title}</div>
        <div class="self-help-card-summary">${art.summary}</div>
      </div>
    `,
      )
      .join('');

    listEl.querySelectorAll('.self-help-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const flowId = (e.currentTarget as HTMLElement).getAttribute('data-flow-id');
        const url = (e.currentTarget as HTMLElement).getAttribute('data-url');

        if (flowId && this.onLaunchFlow) {
          this.onLaunchFlow(flowId);
          const panel = this.shadowRoot?.querySelector('.self-help-panel');
          panel?.classList.remove('open');
          this.isOpen = false;
        } else if (url) {
          window.open(url, '_blank');
        }
      });
    });
  }
}
