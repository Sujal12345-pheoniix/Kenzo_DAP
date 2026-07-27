/**
 * Flow progress manager — persists step completion per user.
 * @module flow/progress-manager
 */

import type { IProgressManager, IStorageService } from '@/core/interfaces';
import type { FlowProgress } from '@/types';

const PROGRESS_PREFIX = 'progress_';

export class ProgressManager implements IProgressManager {
  constructor(private readonly storage: IStorageService) {}

  getProgress(flowId: string): FlowProgress | null {
    const p = this.storage.get<FlowProgress>(PROGRESS_PREFIX + flowId);
    
    // Check fallback local/session storage indicators
    if (typeof window !== 'undefined') {
      const isDone = window.localStorage?.getItem(`kenzo_flow_done_${flowId}`) === 'true' ||
                     window.sessionStorage?.getItem(`kenzo_flow_done_${flowId}`) === 'true';
      if (isDone) {
        const progress = p ?? this.createInitial(flowId);
        progress.completed = true;
        progress.dismissed = true;
        return progress;
      }
    }

    return p;
  }

  saveProgress(progress: FlowProgress): void {
    this.storage.set(PROGRESS_PREFIX + progress.flowId, progress);
    if (progress.completed || progress.dismissed) {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage?.setItem(`kenzo_flow_done_${progress.flowId}`, 'true');
          window.sessionStorage?.setItem(`kenzo_flow_done_${progress.flowId}`, 'true');
        } catch {
          // ignore
        }
      }
    }
  }

  markStepCompleted(flowId: string, stepId: string): void {
    const progress = this.getProgress(flowId) ?? this.createInitial(flowId);
    if (!progress.completedStepIds.includes(stepId)) {
      progress.completedStepIds.push(stepId);
    }
    progress.lastViewedAt = new Date().toISOString();
    this.saveProgress(progress);
  }

  markFlowCompleted(flowId: string): void {
    const progress = this.getProgress(flowId) ?? this.createInitial(flowId);
    progress.completed = true;
    progress.lastViewedAt = new Date().toISOString();
    this.saveProgress(progress);
  }

  markFlowDismissed(flowId: string): void {
    const progress = this.getProgress(flowId) ?? this.createInitial(flowId);
    progress.dismissed = true;
    progress.lastViewedAt = new Date().toISOString();
    this.saveProgress(progress);
  }

  reset(flowId: string): void {
    this.storage.remove(PROGRESS_PREFIX + flowId);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.removeItem(`kenzo_flow_done_${flowId}`);
        window.sessionStorage?.removeItem(`kenzo_flow_done_${flowId}`);
      } catch {
        // ignore
      }
    }
  }

  private createInitial(flowId: string): FlowProgress {
    const now = new Date().toISOString();
    return {
      flowId,
      currentStepIndex: 0,
      completedStepIds: [],
      startedAt: now,
      lastViewedAt: now,
      completed: false,
      dismissed: false,
    };
  }
}
