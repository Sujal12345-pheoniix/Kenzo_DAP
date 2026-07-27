/**
 * Flow runner — orchestrates flow lifecycle from start to completion.
 * @module flow/flow-runner
 */

import type {
  IAnalyticsTracker,
  IConditionEvaluator,
  IEventBus,
  IFlowRunner,
  ILogger,
  INavigationWatcher,
  IProgressManager,
} from '@/core/interfaces';
import type { Flow, StepAction } from '@/types';
import { StepEngine } from '@/flow/step-engine';

export class FlowRunner implements IFlowRunner {
  private activeFlow: Flow | null = null;
  private stepEngine: StepEngine | null = null;
  private navigationUnsubscribe: (() => void) | null = null;

  constructor(
    private readonly progressManager: IProgressManager,
    private readonly conditionEvaluator: IConditionEvaluator,
    private readonly navigationWatcher: INavigationWatcher,
    private readonly analytics: IAnalyticsTracker,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly createStepEngine: (onFlowEnd: (action: StepAction) => void) => StepEngine,
  ) {}

  async start(flow: Flow, startIndex = 0): Promise<void> {
    if (this.activeFlow) {
      this.logger.warn('Stopping active flow before starting new one', {
        activeFlowId: this.activeFlow.id,
      });
      this.stop();
    }

    // Only warn on URL rule mismatch — don't throw, to allow manual preview triggers
    if (flow.urlRules && flow.urlRules.length > 0 && !this.conditionEvaluator.evaluateUrlRules(flow.urlRules)) {
      this.logger.warn(`[Kenzo] Flow "${flow.id}" URL rules do not match current page — running anyway (manual trigger)`, { flowId: flow.id });
    }

    // Evaluate display conditions but only warn
    if (flow.conditions && flow.conditions.length > 0 && !this.conditionEvaluator.evaluateConditions(flow.conditions)) {
      this.logger.warn(`[Kenzo] Flow "${flow.id}" display conditions not met — running anyway`, { flowId: flow.id });
    }

    const existingProgress = this.progressManager.getProgress(flow.id);
    if (existingProgress?.completed || existingProgress?.dismissed) {
      this.logger.info('Flow already completed or dismissed', { flowId: flow.id });
    }

    this.activeFlow = flow;
    this.stepEngine = this.createStepEngine((action) => this.handleFlowEnd(action));
    this.stepEngine.init(flow, startIndex);

    this.navigationUnsubscribe = this.navigationWatcher.onNavigate(() => {
      // Stop this flow when user navigates to a new page.
      // The lifecycle manager will trigger the correct walkthrough for the new page.
      if (this.activeFlow) {
        this.logger.debug('Stopping flow on navigation', { flowId: this.activeFlow.id });
        this.stop();
      }
    });

    this.eventBus.emit('flow:started', { flowId: flow.id });

    this.analytics.track({
      type: 'flow_started',
      flowId: flow.id,
      sessionId: '',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    this.logger.info('Flow started', { flowId: flow.id, name: flow.name });
    await this.stepEngine.goToStep(startIndex);
  }

  stop(): void {
    if (!this.activeFlow) return;

    const flowId = this.activeFlow.id;
    void this.stepEngine?.teardown();
    this.stepEngine = null;
    this.activeFlow = null;

    this.navigationUnsubscribe?.();
    this.navigationUnsubscribe = null;

    this.eventBus.emit('flow:stopped', { flowId });
    this.logger.info('Flow stopped', { flowId });
  }

  isRunning(): boolean {
    return this.activeFlow !== null;
  }

  getActiveFlowId(): string | null {
    return this.activeFlow?.id ?? null;
  }

  private handleFlowEnd(action: StepAction): void {
    if (!this.activeFlow) return;

    const flowId = this.activeFlow.id;

    switch (action) {
      case 'finish':
        this.progressManager.markFlowCompleted(flowId);
        this.eventBus.emit('flow:completed', { flowId });
        this.analytics.track({
          type: 'flow_completed',
          flowId,
          sessionId: '',
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
        break;
      case 'skip':
      case 'close':
        this.progressManager.markFlowDismissed(flowId);
        this.eventBus.emit('flow:dismissed', { flowId });
        this.analytics.track({
          type: 'flow_dismissed',
          flowId,
          sessionId: '',
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          properties: { reason: action },
        });
        break;
      default:
        break;
    }

    this.stop();
  }

}
