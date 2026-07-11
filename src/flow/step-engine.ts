/**
 * Step engine — manages current step state within a flow.
 * @module flow/step-engine
 */

import type {
  IAnalyticsTracker,
  IConditionEvaluator,
  IElementResolver,
  IEventBus,
  ILogger,
  IOverlayManager,
  IProgressManager,
  IStepEngine,
  ITooltipAnimator,
  ITooltipPositioner,
  ITooltipRenderer,
} from '@/core/interfaces';
import type { IConfigService } from '@/core/interfaces';
import type { Flow, FlowStep, StepAction } from '@/types';

export class StepEngine implements IStepEngine {
  private flow: Flow | null = null;
  private currentIndex = 0;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly elementResolver: IElementResolver,
    private readonly overlayManager: IOverlayManager,
    private readonly tooltipRenderer: ITooltipRenderer,
    private readonly tooltipPositioner: ITooltipPositioner,
    private readonly tooltipAnimator: ITooltipAnimator,
    private readonly progressManager: IProgressManager,
    private readonly conditionEvaluator: IConditionEvaluator,
    private readonly analytics: IAnalyticsTracker,
    private readonly eventBus: IEventBus,
    private readonly config: IConfigService,
    private readonly logger: ILogger,
    private readonly onFlowEnd: (action: StepAction) => void,
  ) {}

  init(flow: Flow, startIndex = 0): void {
    this.flow = flow;
    this.currentIndex = startIndex;
  }

  getCurrentStep(): FlowStep | null {
    if (!this.flow) return null;
    const sorted = this.getSortedSteps();
    return sorted[this.currentIndex] ?? null;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  async goToStep(index: number): Promise<void> {
    if (!this.flow) return;

    const sorted = this.getSortedSteps();
    if (index < 0 || index >= sorted.length) return;

    await this.teardownCurrentStep();

    this.currentIndex = index;
    const step = sorted[index];

    if (step.conditions && !this.conditionEvaluator.evaluateConditions(step.conditions)) {
      this.logger.debug('Step conditions not met, skipping', { stepId: step.id });
      if (index < sorted.length - 1) {
        await this.goToStep(index + 1);
      }
      return;
    }

    await this.renderStep(step);
  }

  async next(): Promise<boolean> {
    if (!this.flow || !this.canGoNext()) return false;
    await this.goToStep(this.currentIndex + 1);
    return true;
  }

  async previous(): Promise<boolean> {
    if (!this.canGoPrevious()) return false;
    await this.goToStep(this.currentIndex - 1);
    return true;
  }

  canGoNext(): boolean {
    if (!this.flow) return false;
    return this.currentIndex < this.getSortedSteps().length - 1;
  }

  canGoPrevious(): boolean {
    return this.currentIndex > 0;
  }

  async refreshCurrentStep(): Promise<void> {
    await this.goToStep(this.currentIndex);
  }

  async handleAction(action: StepAction): Promise<void> {
    if (!this.flow) return;

    const step = this.getCurrentStep();
    if (!step) return;

    switch (action) {
      case 'next':
        this.progressManager.markStepCompleted(this.flow.id, step.id);
        if (this.canGoNext()) {
          await this.next();
        } else {
          this.onFlowEnd('finish');
        }
        break;
      case 'previous':
        await this.previous();
        break;
      case 'skip':
        this.onFlowEnd('skip');
        break;
      case 'finish':
        this.progressManager.markStepCompleted(this.flow.id, step.id);
        this.onFlowEnd('finish');
        break;
      case 'close':
        this.onFlowEnd('close');
        break;
    }
  }

  async teardown(): Promise<void> {
    await this.teardownCurrentStep();
    this.flow = null;
    this.currentIndex = 0;
  }

  private async renderStep(step: FlowStep): Promise<void> {
    if (!this.flow) return;

    const resolved = await this.elementResolver.resolve(step.selector);
    if (!resolved) {
      this.logger.error('Cannot render step — element not found', undefined, {
        stepId: step.id,
      });
      return;
    }

    if (step.autoScroll !== false) {
      resolved.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const displayMode = step.displayMode ?? 'spotlight';
    if (displayMode === 'spotlight') {
      this.overlayManager.showSpotlight(resolved.element, {
        padding: step.spotlightPadding,
        blockInteraction: step.blockInteraction,
      });
    } else if (displayMode === 'highlight') {
      this.overlayManager.showHighlight(resolved.element);
    }

    const config = this.config.get();
    const sorted = this.getSortedSteps();

    const tooltip = this.tooltipRenderer.render(
      {
        step,
        flowId: this.flow.id,
        stepIndex: this.currentIndex,
        totalSteps: sorted.length,
        darkMode: config.darkMode,
        onAction: (action) => void this.handleAction(action),
      },
      resolved.element,
    );

    const placement = step.placement ?? 'auto';
    await this.tooltipPositioner.position(tooltip, resolved.element, placement);
    await this.tooltipAnimator.enter(tooltip);

    this.progressManager.markStepCompleted(this.flow.id, step.id);

    const progress = this.progressManager.getProgress(this.flow.id);
    if (progress) {
      progress.currentStepIndex = this.currentIndex;
      this.progressManager.saveProgress(progress);
    }

    this.eventBus.emit('step:viewed', {
      flowId: this.flow.id,
      stepId: step.id,
      stepIndex: this.currentIndex,
    });

    this.eventBus.emit('step:changed', {
      flowId: this.flow.id,
      stepId: step.id,
      stepIndex: this.currentIndex,
    });

    this.analytics.track({
      type: 'step_viewed',
      flowId: this.flow.id,
      stepId: step.id,
      sessionId: '',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      properties: { stepIndex: this.currentIndex },
    });

    if (step.autoAdvanceDelay && step.autoAdvanceDelay > 0) {
      this.autoAdvanceTimer = setTimeout(() => {
        void this.handleAction('next');
      }, step.autoAdvanceDelay);
    }
  }

  private async teardownCurrentStep(): Promise<void> {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }

    const tooltipEl = this.tooltipRenderer.getElement();
    if (tooltipEl) {
      await this.tooltipAnimator.exit(tooltipEl);
    }

    this.tooltipPositioner.destroy();
    this.tooltipRenderer.destroy();
    this.overlayManager.hide();
  }

  private getSortedSteps(): FlowStep[] {
    if (!this.flow) return [];
    return [...this.flow.steps].sort((a, b) => a.order - b.order);
  }
}
