import { describe, it, expect, beforeEach } from 'vitest';
import { ContextLevelWriter } from './contextLevelWriter.ts';
import { MockLayout, MockFileSystem, MockLogger } from '../test/fakes.ts';

describe('ContextLevelWriter', () => {
  let layout: MockLayout;
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let writer: ContextLevelWriter;

  beforeEach(() => {
    layout = new MockLayout();
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    writer = new ContextLevelWriter(layout, fileSystem, logger);
  });

  it('should write context schema with correct entityRef', async () => {
    await writer.write('/workspace/blueprints', 'my-context', 'my-system');

    const writtenPaths = Array.from(fileSystem.writtenFiles.keys());
    expect(writtenPaths).toContain('/workspace/blueprints/context.yaml');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expect(yamlContent).toContain('entityRef: my-context');
    expect(yamlContent).toContain('name: my-context Context');
    expect(yamlContent).toContain('level: context');
    expect(yamlContent).toContain('entityRef: my-context/my-system');
    expect(yamlContent).toContain('type: software-system');
  });

  it('should slugify context name in entityRef', async () => {
    await writer.write('/workspace/blueprints', 'My Context Name', 'my-system');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expect(yamlContent).toContain('entityRef: my-context-name');
    expect(yamlContent).toContain('name: My Context Name Context');
  });

  it('should log successful write', async () => {
    await writer.write('/workspace/blueprints', 'test-context', 'test-system');

    expect(logger.logs.some(log => log.includes('Saved Context schema'))).toBe(true);
  });
});
