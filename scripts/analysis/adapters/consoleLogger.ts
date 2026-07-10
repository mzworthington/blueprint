import type { LoggerPort } from '../domain/ports';

export class ConsoleLogger implements LoggerPort {
  private formatMessage(level: string, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[BLUEPRINT - ${level}] [${timestamp}] ${message}${ctxString}`;
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.log(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errMessage = error ? `\nError: ${error instanceof Error ? error.stack || error.message : JSON.stringify(error)}` : '';
    console.error(this.formatMessage('ERROR', message, context) + errMessage);
  }
}
