/**
 * Structured Diagnostics Logger.
 * Records step transitions, resolution failures, and visibility rule results.
 * Feeds in-context Diagnostics overlay and selector-repair backend.
 * @module core/logger/diagnostics-logger
 */

export interface DiagnosticsEvent {
  id: string;
  type: 'resolution_success' | 'resolution_failure' | 'rule_evaluated' | 'step_transition' | 'error_boundary';
  contentId?: string;
  stepId?: string;
  reason?: string;
  confidence?: number;
  selector?: any;
  ruleResult?: boolean;
  contextSnapshot?: Record<string, any>;
  timestamp: string;
}

export class DiagnosticsLogger {
  private static instance: DiagnosticsLogger;
  private logs: DiagnosticsEvent[] = [];
  private listeners: Array<(event: DiagnosticsEvent) => void> = [];
  private maxLogs = 200;

  static getInstance(): DiagnosticsLogger {
    if (!DiagnosticsLogger.instance) {
      DiagnosticsLogger.instance = new DiagnosticsLogger();
    }
    return DiagnosticsLogger.instance;
  }

  log(event: Omit<DiagnosticsEvent, 'id' | 'timestamp'>): DiagnosticsEvent {
    const fullEvent: DiagnosticsEvent = {
      ...event,
      id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(fullEvent);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Notify active listeners (e.g. extension/builder overlay)
    this.listeners.forEach((fn) => {
      try {
        fn(fullEvent);
      } catch (_) {}
    });

    return fullEvent;
  }

  getLogs(): DiagnosticsEvent[] {
    return [...this.logs];
  }

  subscribe(listener: (event: DiagnosticsEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  clear(): void {
    this.logs = [];
  }
}
