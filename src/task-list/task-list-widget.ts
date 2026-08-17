/**
 * Whatfix-Style Task List Launcher Widget.
 * Floating circular button with live notification badge count, slide-in checklist panel,
 * event-driven completion auto-progress, cross-device sync, and segmentation rule evaluation.
 * @module task-list/task-list-widget
 */

import type { SegmentationRule } from '@/core/conditions/condition-evaluator';
import { ConditionEvaluator } from '@/core/conditions/condition-evaluator';

export interface TaskListItem {
  id: string;
  title: string;
  description?: string;
  flowId?: string;
  targetUrl?: string;
  completed: boolean;
  rule?: SegmentationRule;
}

export interface TaskListConfig {
  id?: string;
  title?: string;
  position?: 'bottom-right' | 'bottom-left';
  brandColor?: string;
  tasks: TaskListItem[];
  rule?: SegmentationRule;
  onCompleted?: (config: TaskListConfig) => void;
}

export class TaskListWidget {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private isOpen = false;
  private tasks: TaskListItem[] = [];
  private config: TaskListConfig | null = null;
  private hasTrackedCompletion = false;

  constructor(
    private readonly conditionEvaluator: ConditionEvaluator,
    private readonly onLaunchFlow: (flowId: string) => void,
    private readonly onSyncStateToServer?: (tasks: TaskListItem[]) => void,
  ) {}

  init(config: TaskListConfig, savedProgress?: Record<string, boolean>): void {
    this.config = config;

    // Check widget-level segmentation rule
    if (config.rule && !this.conditionEvaluator.evaluate(config.rule)) {
      return; // Not eligible for this user
    }

    // Filter tasks based on task-level segmentation rules
    this.tasks = config.tasks.filter((task) => {
      if (task.rule && !this.conditionEvaluator.evaluate(task.rule)) {
        return false;
      }
      return true;
    });

    // Load persisted local progress
    const listKey = `kenzo_checklist_${config.id || config.title || 'default'}`;
    let locallyCompleted: string[] = [];
    if (typeof localStorage !== 'undefined') {
      try {
        locallyCompleted = JSON.parse(localStorage.getItem(listKey) || '[]');
      } catch (_) {}
    }

    this.tasks.forEach((t) => {
      if (savedProgress && savedProgress[t.id] !== undefined) {
        t.completed = savedProgress[t.id];
      } else if (locallyCompleted.includes(t.id)) {
        t.completed = true;
      }
    });

    this.render();
  }

  private persistProgress(): void {
    if (!this.config || typeof localStorage === 'undefined') return;
    const listKey = `kenzo_checklist_${this.config.id || this.config.title || 'default'}`;
    const completedIds = this.tasks.filter(t => t.completed).map(t => t.id);
    localStorage.setItem(listKey, JSON.stringify(completedIds));
  }

  markTaskCompleted(flowIdOrTaskId: string): void {
    let updated = false;
    this.tasks.forEach((task) => {
      if (task.id === flowIdOrTaskId || task.flowId === flowIdOrTaskId) {
        if (!task.completed) {
          task.completed = true;
          updated = true;
        }
      }
    });

    if (updated) {
      this.persistProgress();
      this.updateBadgeAndProgress();
      if (this.onSyncStateToServer) {
        this.onSyncStateToServer(this.tasks);
      }
      this.checkAllCompleted();
    }
  }

  private checkAllCompleted(): void {
    const completedCount = this.tasks.filter(t => t.completed).length;
    const totalCount = this.tasks.length;
    if (totalCount > 0 && completedCount === totalCount && !this.hasTrackedCompletion) {
      this.hasTrackedCompletion = true;
      this.config?.onCompleted?.(this.config);
    }
  }

  private render(): void {
    if (typeof document === 'undefined') return;

    // Remove existing host if re-rendering
    document.getElementById('kenzo-task-list-root')?.remove();

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'kenzo-task-list-root';
    this.shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483600; pointer-events: none;';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const position = this.config?.position || 'bottom-left';
    const brandColor = this.config?.brandColor || '#6366f1';
    const isRight = position === 'bottom-right';

    const style = document.createElement('style');
    style.textContent = `
      .task-launcher-btn {
        position: fixed;
        bottom: 24px;
        ${isRight ? 'right: 24px;' : 'left: 24px;'}
        pointer-events: auto;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${brandColor}, #4f46e5);
        color: #ffffff;
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483600;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
      }
      .task-launcher-btn:hover {
        transform: scale(1.08);
        box-shadow: 0 8px 30px rgba(99, 102, 241, 0.6);
      }
      .task-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        background: #ef4444;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        border: 2px solid #141421;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      }
      .task-badge.hidden {
        display: none;
      }
      .task-panel {
        position: fixed;
        bottom: 92px;
        ${isRight ? 'right: 24px;' : 'left: 24px;'}
        pointer-events: auto;
        width: 360px;
        max-width: calc(100vw - 32px);
        max-height: 520px;
        background: linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(24, 24, 37, 0.98));
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 25px rgba(99, 102, 241, 0.2);
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483601;
        transform: translateY(20px) scale(0.96);
        opacity: 0;
        visibility: hidden;
        backdrop-filter: blur(16px);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .task-panel.open {
        transform: translateY(0) scale(1);
        opacity: 1;
        visibility: visible;
      }
      .task-header {
        padding: 20px 24px;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .task-header-title {
        font-size: 17px;
        font-weight: 800;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .task-progress-label {
        font-size: 12px;
        color: #cbd5e1 !important;
        -webkit-text-fill-color: #cbd5e1 !important;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .task-progress-bar-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 3px;
        overflow: hidden;
      }
      .task-progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #10b981);
        border-radius: 3px;
        transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .task-completion-banner {
        margin-top: 10px;
        padding: 8px 12px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        color: #34d399;
        display: flex;
        align-items: center;
        gap: 6px;
        animation: task-banner-pop 0.3s ease-out;
      }
      @keyframes task-banner-pop {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .task-list-body {
        padding: 12px;
        overflow-y: auto;
        flex: 1;
      }
      .task-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        margin-bottom: 6px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }
      .task-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(99, 102, 241, 0.3);
      }
      .task-checkbox {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 1px;
        flex-shrink: 0;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .task-item:hover .task-checkbox {
        border-color: #6366f1;
        transform: scale(1.08);
      }
      .task-item.completed .task-checkbox {
        background: #10b981;
        border-color: #10b981;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
      }
      .task-item-content {
        flex: 1;
      }
      .task-item-title {
        font-size: 14px;
        font-weight: 600;
        color: #f1f5f9 !important;
        -webkit-text-fill-color: #f1f5f9 !important;
        margin-bottom: 3px;
        transition: all 0.2s ease;
      }
      .task-item.completed .task-item-title {
        text-decoration: line-through;
        color: #94a3b8 !important;
        -webkit-text-fill-color: #94a3b8 !important;
      }
      .task-item-desc {
        font-size: 12px;
        color: #94a3b8 !important;
        -webkit-text-fill-color: #94a3b8 !important;
        line-height: 1.4;
      }
      .task-start-btn {
        padding: 5px 12px;
        border-radius: 8px;
        background: rgba(99, 102, 241, 0.2);
        color: #a5b4fc;
        border: 1px solid rgba(99, 102, 241, 0.4);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .task-start-btn:hover {
        background: #4f46e5;
        color: #ffffff;
        border-color: #6366f1;
      }
    `;

    this.shadowRoot.appendChild(style);

    const btn = document.createElement('button');
    btn.className = 'task-launcher-btn';
    btn.innerHTML = `
      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
      </svg>
      <div class="task-badge">0</div>
    `;

    const panel = document.createElement('div');
    panel.className = 'task-panel';

    btn.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        panel.classList.add('open');
      } else {
        panel.classList.remove('open');
      }
    });

    this.shadowRoot.appendChild(btn);
    this.shadowRoot.appendChild(panel);
    document.body.appendChild(this.shadowHost);

    this.renderPanelContent();
    this.updateBadgeAndProgress();
  }

  private renderPanelContent(): void {
    if (!this.shadowRoot) return;
    const panel = this.shadowRoot.querySelector('.task-panel');
    if (!panel) return;

    const completedCount = this.tasks.filter((t) => t.completed).length;
    const totalCount = this.tasks.length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isAllComplete = totalCount > 0 && completedCount === totalCount;

    panel.innerHTML = `
      <div class="task-header">
        <div class="task-header-title">
          <span>${this.config?.title || 'Onboarding Checklist'}</span>
        </div>
        <div class="task-progress-label">${completedCount} of ${totalCount} completed (${percent}%)</div>
        <div class="task-progress-bar-track">
          <div class="task-progress-bar-fill" style="width: ${percent}%"></div>
        </div>
        ${isAllComplete ? `
          <div class="task-completion-banner">
            <span>🎉</span>
            <span>All tasks completed! Awesome job!</span>
          </div>
        ` : ''}
      </div>
      <div class="task-list-body">
        ${this.tasks
          .map(
            (task) => `
          <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-checkbox" data-task-id="${task.id}">
              ${
                task.completed
                  ? `<svg width="12" height="12" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`
                  : ''
              }
            </div>
            <div class="task-item-content">
              <div class="task-item-title">${task.title}</div>
              ${task.description ? `<div class="task-item-desc">${task.description}</div>` : ''}
            </div>
            ${
              !task.completed && task.flowId
                ? `<button class="task-start-btn" data-flow-id="${task.flowId}">Start</button>`
                : ''
            }
          </div>
        `,
          )
          .join('')}
      </div>
    `;

    // Click handler for task item & checkbox (Toggle state)
    panel.querySelectorAll('.task-item').forEach((itemEl) => {
      itemEl.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Don't toggle if user clicked the "Start" tour button
        if (target.classList.contains('task-start-btn') || target.closest('.task-start-btn')) {
          return;
        }

        const taskId = itemEl.getAttribute('data-task-id');
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
          task.completed = !task.completed;
          this.persistProgress();
          this.updateBadgeAndProgress();
          if (this.onSyncStateToServer) {
            this.onSyncStateToServer(this.tasks);
          }
          this.checkAllCompleted();
        }
      });
    });

    panel.querySelectorAll('.task-start-btn').forEach((startBtn) => {
      startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const flowId = (e.currentTarget as HTMLElement).getAttribute('data-flow-id');
        if (flowId) {
          panel.classList.remove('open');
          this.isOpen = false;
          this.onLaunchFlow(flowId);
        }
      });
    });
  }

  private updateBadgeAndProgress(): void {
    if (!this.shadowRoot) return;
    const badge = this.shadowRoot.querySelector('.task-badge');
    const incompleteCount = this.tasks.filter((t) => !t.completed).length;

    if (badge) {
      if (incompleteCount > 0) {
        badge.textContent = String(incompleteCount);
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    this.renderPanelContent();
  }
}
