/**
 * Structured logger with level filtering.
 * @module core/logger
 */

import type { ILogger } from '@/core/interfaces';
import type { LogLevel } from '@/types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_PREFIX = '[Kenzo]';

export class Logger implements ILogger {
  private level: LogLevel = 'warn';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const merged = error
      ? { ...context, errorMessage: error.message, stack: error.stack }
      : context;
    this.log('error', message, merged);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) return;

    const timestamp = new Date().toISOString();
    const formatted = `${LOG_PREFIX} ${timestamp} [${level.toUpperCase()}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      console[level === 'debug' ? 'log' : level](formatted, context);
    } else {
      console[level === 'debug' ? 'log' : level](formatted);
    }
  }
}
