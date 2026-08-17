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
  title?: string;
  position?: 'bottom-right' | 'bottom-left';
  brandColor?: string;
  tasks: TaskListItem[];
  rule?: SegmentationRule;
}

export class TaskListWidget {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private isOpen = false;
  private tasks: TaskListItem[] = [];
  private config: TaskListConfig | null = null;

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

    // Merge saved progress
    if (savedProgress) {
      this.tasks.forEach((t) => {
        if (savedProgress[t.id] !== undefined) {
          t.completed = savedProgress[t.id];
        }
      });
    }

    this.render();
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
      this.updateBadgeAndProgress();
      if (this.onSyncStateToServer) {
        this.onSyncStateToServer(this.tasks);
      }
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
        border: none;
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
        border: 2px solid #0f0f17;
        box-sizing: border-box;
      }
      .task-badge.hidden {
        display: none;
      }
      .task-panel {
        position: fixed;
        bottom: 92px;
        ${isRight ? 'right: 24px;' : 'left: 24px;'}
        width: 360px;
        max-width: calc(100vw - 32px);
        max-height: 520px;
        background: #141421;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        color: #cdd6f4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483601;
        transform: translateY(20px) scale(0.96);
        opacity: 0;
        visibility: hidden;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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
        font-weight: 700;
        color: #f5e0dc;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .task-progress-label {
        font-size: 12px;
        color: #a6adc8;
        font-weight: 500;
        margin-bottom: 8px;
      }
      .task-progress-bar-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }
      .task-progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, ${brandColor}, #10b981);
        border-radius: 3px;
        transition: width 0.3s ease;
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
        background: rgba(255, 255, 255, 0.02);
        transition: background 0.2s ease;
      }
      .task-item:hover {
        background: rgba(255, 255, 255, 0.06);
      }
      .task-checkbox {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 2px;
        flex-shrink: 0;
      }
      .task-item.completed .task-checkbox {
        background: #10b981;
        border-color: #10b981;
      }
      .task-item-content {
        flex: 1;
      }
      .task-item-title {
        font-size: 14px;
        font-weight: 600;
        color: #e8e8f0;
        margin-bottom: 2px;
      }
      .task-item.completed .task-item-title {
        text-decoration: line-through;
        color: #6c7086;
      }
      .task-item-desc {
        font-size: 12px;
        color: #9399b2;
        line-height: 1.4;
      }
      .task-start-btn {
        padding: 6px 12px;
        border-radius: 6px;
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
        border: 1px solid rgba(99, 102, 241, 0.3);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .task-start-btn:hover {
        background: ${brandColor};
        color: #ffffff;
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

    panel.innerHTML = `
      <div class="task-header">
        <div class="task-header-title">
          <span>${this.config?.title || 'Onboarding Checklist'}</span>
        </div>
        <div class="task-progress-label">${completedCount} of ${totalCount} completed (${percent}%)</div>
        <div class="task-progress-bar-track">
          <div class="task-progress-bar-fill" style="width: ${percent}%"></div>
        </div>
      </div>
      <div class="task-list-body">
        ${this.tasks
          .map(
            (task) => `
          <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-checkbox">
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

    panel.querySelectorAll('.task-start-btn').forEach((startBtn) => {
      startBtn.addEventListener('click', (e) => {
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
