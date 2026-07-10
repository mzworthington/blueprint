import pc from 'picocolors';
import type { LoggerPort } from '../domain/ports.ts';

export class ConsoleLogger implements LoggerPort {
  info(message: string, context?: Record<string, unknown>): void {
    const ctxString = context ? pc.dim(` (Context: ${JSON.stringify(context)})`) : '';
    if (message.includes('Starting') || message.includes('Found')) {
      console.log(pc.cyan('ℹ ') + pc.bold(message) + ctxString);
    } else if (message.includes('Saved') || message.includes('Successfully')) {
      console.log(pc.green('✔ ') + pc.bold(pc.green(message)) + ctxString);
    } else {
      console.log(pc.cyan('ℹ ') + message + ctxString);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const ctxString = context ? pc.dim(` (Context: ${JSON.stringify(context)})`) : '';
    console.warn(pc.yellow('⚠ ') + pc.bold(pc.yellow(message)) + ctxString);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const ctxString = context ? pc.dim(` (Context: ${JSON.stringify(context)})`) : '';
    const errMessage = error
      ? pc.red(
          `\nError details: ${error instanceof Error ? error.stack || error.message : JSON.stringify(error)}`
        )
      : '';
    console.error(pc.red('✖ ') + pc.bold(pc.red(message)) + ctxString + errMessage);
  }
}
