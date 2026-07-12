import type { LoggerPort } from '../../core';

/**
 * Structured console logger implementation conforming to the LoggerPort outbound interface.
 * Ensures logging is formatted with timestamps and metadata for tracing.
 */
export const ConsoleLoggerAdapter: LoggerPort = {
  info: (message: string, context?: Record<string, unknown>): void => {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context: context || {},
    };
    console.log(
      `%c[BLUEPRINT - INFO]%c [${payload.timestamp}] ${message}`,
      'color: #8b5cf6; font-weight: bold;',
      'color: #9ca3af;',
      context ? '\nContext:' : '',
      context || ''
    );
  },

  warn: (message: string, context?: Record<string, unknown>): void => {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context: context || {},
    };
    console.warn(
      `%c[BLUEPRINT - WARN]%c [${payload.timestamp}] ${message}`,
      'color: #eab308; font-weight: bold;',
      'color: #9ca3af;',
      context ? '\nContext:' : '',
      context || ''
    );
  },

  error: (message: string, error?: unknown, context?: Record<string, unknown>): void => {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      context: context || {},
    };
    console.error(
      `%c[BLUEPRINT - ERROR]%c [${payload.timestamp}] ${message}`,
      'color: #ef4444; font-weight: bold;',
      'color: #f3f4f6;',
      '\nError:',
      payload.error,
      context ? '\nContext:' : '',
      context || ''
    );
  },
};
