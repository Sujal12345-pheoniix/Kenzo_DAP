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

    // Normalize DB buttons format {text, action, style} → SDK format {label, action, primary}
    if (step.buttons && step.buttons.length > 0) {
      step = {
        ...step,
        buttons: step.buttons.map((btn: any) => ({
          label: btn.label ?? btn.text ?? 'Next',
          action: btn.action === 'prev' ? 'previous' : btn.action,
          primary: btn.primary ?? btn.style === 'primary',
        }))
      };
    }

    const displayMode = step.displayMode ?? 'tooltip';
    const isModal = displayMode === 'modal';
    const isCenterMode = isModal || (step.selector as any)?.value === 'body' || (step.selector as any)?.css === 'body';

    let targetElement: Element = document.body;
    if (!isCenterMode) {
      const resolved = await this.elementResolver.resolve(step.selector);
      if (resolved && resolved.element !== document.body) {
        targetElement = resolved.element;
        if (step.autoScroll !== false) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 400));
        }

        if (displayMode === 'spotlight') {
          this.overlayManager.showSpotlight(targetElement, {
            padding: step.spotlightPadding,
            blockInteraction: step.blockInteraction,
          });
        } else if (displayMode === 'highlight') {
          this.overlayManager.showHighlight(targetElement);
        }
      } else {
        // Element not found — render as modal fallback
        this.overlayManager.hide();
      }
    } else {
      this.overlayManager.hide();
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
      targetElement,
    );

    if (!isCenterMode && targetElement !== document.body) {
      const placement = step.placement ?? 'auto';
      await this.tooltipPositioner.position(tooltip, targetElement, placement);
    } else {
      // Center modal positioning — override any floating-ui positioning
      Object.assign(tooltip.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
    }
    await this.tooltipAnimator.enter(tooltip);

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
