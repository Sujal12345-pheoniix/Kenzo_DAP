import { describe, expect, it, vi } from 'vitest';
import { TaskListWidget } from './task-list-widget';
import { ConditionEvaluator } from '@/core/conditions/condition-evaluator';
import { ConfigService } from '@/core/config/config.service';
import { Logger } from '@/core/logger/logger';

describe('TaskListWidget', () => {
  const logger = new Logger();
  const config = new ConfigService(logger);
  config.init({ apiKey: 'test-key' });
  const evaluator = new ConditionEvaluator(config);

  it('renders floating action button and notification badge count', () => {
    const launchFn = vi.fn();
    const widget = new TaskListWidget(evaluator, launchFn);

    widget.init({
      title: 'Welcome Checklist',
      tasks: [
        { id: 't1', title: 'Complete Profile', flowId: 'f1', completed: false },
        { id: 't2', title: 'Create First Project', flowId: 'f2', completed: false },
      ],
    });

    const root = document.getElementById('kenzo-task-list-root');
    expect(root).not.toBeNull();
    const shadow = root?.shadowRoot;
    expect(shadow).not.toBeNull();

    const badge = shadow?.querySelector('.task-badge');
    expect(badge?.textContent).toBe('2');
  });

  it('auto-marks task complete and decrements badge count when flow finishes', () => {
    const launchFn = vi.fn();
    const widget = new TaskListWidget(evaluator, launchFn);

    widget.init({
      title: 'Welcome Checklist',
      tasks: [
        { id: 't1', title: 'Complete Profile', flowId: 'f1', completed: false },
        { id: 't2', title: 'Create First Project', flowId: 'f2', completed: false },
      ],
    });

    widget.markTaskCompleted('f1');

    const shadow = document.getElementById('kenzo-task-list-root')?.shadowRoot;
    const badge = shadow?.querySelector('.task-badge');
    expect(badge?.textContent).toBe('1');
  });
});
