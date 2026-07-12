import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleLogger } from './consoleLogger.ts';

describe('ConsoleLogger', () => {
  const logger = new ConsoleLogger();

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages with correct icon styles', () => {
    logger.info('Starting AST analysis');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ℹ'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Starting AST analysis'));

    logger.info('Saved layout schema');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✔'));

    logger.info('Some info message', { count: 5 });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Some info message'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('count'));
  });

  it('should log warnings', () => {
    logger.warn('Skipping files', { pattern: '*.js' });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('⚠'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Skipping files'));
  });

  it('should log errors with stack trace or error details', () => {
    logger.error('Analysis failed', new Error('AST Error'), { path: '/src' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('✖'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Analysis failed'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('AST Error'));
  });
});
