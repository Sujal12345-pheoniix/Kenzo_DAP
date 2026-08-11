/**
 * Self Help Widget — slide-over panel with keyword and semantic search over authored content and external KB.
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
    this.shadowHost.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483400;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .self-help-fab {
        position: fixed;
        bottom: 24px;
        right: 90px;
        background: #181825;
        color: #cba6f7;
        border: 1px solid rgba(203, 166, 247, 0.3);
        border-radius: 24px;
        padding: 10px 18px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 2147483400;
      }
      .self-help-panel {
        position: fixed;
        top: 0;
        right: -380px;
        width: 360px;
        height: 100vh;
        background: #11111b;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
        color: #cdd6f4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        z-index: 2147483401;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .self-help-panel.open {
        right: 0;
      }
      .self-help-header {
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .self-help-title {
        font-size: 18px;
        font-weight: 700;
        color: #f5e0dc;
        margin-bottom: 12px;
      }
      .self-help-search-input {
        width: 100%;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: #ffffff;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
      }
      .self-help-search-input:focus {
        border-color: #cba6f7;
      }
      .self-help-list {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
      }
      .self-help-card {
        padding: 14px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 10px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .self-help-card:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .self-help-card-title {
        font-size: 14px;
        font-weight: 600;
        color: #cba6f7;
        margin-bottom: 4px;
      }
      .self-help-card-summary {
        font-size: 12px;
        color: #a6adc8;
        line-height: 1.4;
      }
    `;

    this.shadowRoot.appendChild(style);

    const fab = document.createElement('button');
    fab.className = 'self-help-fab';
    fab.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      <span>Self Help</span>
    `;

    const panel = document.createElement('div');
    panel.className = 'self-help-panel';
    panel.innerHTML = `
      <div class="self-help-header">
        <div class="self-help-title">Help & Knowledge</div>
        <input type="text" class="self-help-search-input" placeholder="Search guides, walkthroughs, FAQs..." />
      </div>
      <div class="self-help-list"></div>
    `;

    fab.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      panel.classList.toggle('open', this.isOpen);
    });

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
      listEl.innerHTML = `<div style="text-align:center; color:#6c7086; padding: 20px;">No articles found</div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (art) => `
      <div class="self-help-card" data-flow-id="${art.flowId || ''}" data-url="${art.externalUrl || ''}">
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
