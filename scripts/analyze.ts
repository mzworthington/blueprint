import { TsMorphParserAdapter } from './analysis/adapters/tsMorphParser.ts';
import { TreeSitterParserAdapter } from './analysis/adapters/treeSitterParser.ts';
import { DagreLayoutAdapter } from './analysis/adapters/dagreLayout.ts';
import { NodeFileSystemAdapter } from './analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from './analysis/adapters/consoleLogger.ts';
import { CodebaseAnalyzer } from './analysis/domain/analyzer.ts';

async function run() {
  const args = process.argv.slice(2);
  const useTreeSitter = args.includes('--parser=tree-sitter');

  let globPattern = 'src/**/*.{ts,tsx}';
  const globArg = args.find(a => a.startsWith('--glob='));
  if (globArg) {
    globPattern = globArg.split('=')[1];
  }

  const parser = useTreeSitter ? new TreeSitterParserAdapter() : new TsMorphParserAdapter();
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
    await analyzer.runAnalysis(globPattern);
  } catch (error) {
    logger.error('Failed to run AST analysis', error);
    process.exit(1);
  }
}

run();
