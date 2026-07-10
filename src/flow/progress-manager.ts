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
    return this.storage.get<FlowProgress>(PROGRESS_PREFIX + flowId);
  }

  saveProgress(progress: FlowProgress): void {
    this.storage.set(PROGRESS_PREFIX + progress.flowId, progress);
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
