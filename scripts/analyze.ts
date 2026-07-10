import { TsMorphParserAdapter } from './analysis/adapters/tsMorphParser.ts';
import { DagreLayoutAdapter } from './analysis/adapters/dagreLayout.ts';
import { NodeFileSystemAdapter } from './analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from './analysis/adapters/consoleLogger.ts';
import { CodebaseAnalyzer } from './analysis/domain/analyzer.ts';

async function run() {
  const parser = new TsMorphParserAdapter();
  const layout = new DagreLayoutAdapter();
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  const analyzer = new CodebaseAnalyzer({
    parser,
    layout,
    fileSystem,
    logger,
  });

  try {
    await analyzer.runAnalysis();
  } catch (error) {
    logger.error('Failed to run AST analysis', error);
    process.exit(1);
  }
}

run();
