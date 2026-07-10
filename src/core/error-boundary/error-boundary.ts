/**
 * Global error boundary — isolates SDK failures from host page.
 * @module core/error-boundary
 */

import type { IErrorBoundary, IEventBus, ILogger } from '@/core/interfaces';

export class ErrorBoundary implements IErrorBoundary {
  private handlers: Array<(error: Error, context: string) => void> = [];

  constructor(
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus,
  ) {}

  wrap<T>(fn: () => T, context: string): T {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, context);
      throw error;
    }
  }

  async wrapAsync<T>(fn: () => Promise<T>, context: string): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error, context);
      throw error;
    }
  }

  onError(handler: (error: Error, context: string) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private handleError(error: unknown, context: string): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error(`Error in ${context}`, err);
    this.eventBus.emit('sdk:error', err);

    for (const handler of this.handlers) {
      try {
        handler(err, context);
      } catch {
        // Handler failures are isolated
      }
    }
  }
}
