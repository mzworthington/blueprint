import * as p from '@clack/prompts';
import pc from 'picocolors';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { TsMorphParserAdapter } from './analysis/adapters/tsMorphParser.ts';
import { TreeSitterParserAdapter } from './analysis/adapters/treeSitterParser.ts';
import { DagreLayoutAdapter } from './analysis/adapters/dagreLayout.ts';
import { NodeFileSystemAdapter } from './analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from './analysis/adapters/consoleLogger.ts';
import { CodebaseAnalyzer } from './analysis/domain/analyzer.ts';
import {
  loadAnalysisConfig,
  mergeAnalysisOptions,
} from './analysis/adapters/loadAnalysisConfig.ts';
import { createCliCancellation, isCancellationError } from './analysis/domain/cancellation.ts';

function askPathWithTabComplete(message: string, defaultValue: string): Promise<string> {
  return new Promise(resolve => {
    const completer = (line: string) => {
      const lineNormalized = line.replace(/\\/g, '/');
      const lastSlashIdx = lineNormalized.lastIndexOf('/');
      const dirPath = lastSlashIdx !== -1 ? lineNormalized.substring(0, lastSlashIdx) : '.';
      const filePrefix =
        lastSlashIdx !== -1 ? lineNormalized.substring(lastSlashIdx + 1) : lineNormalized;

      try {
        const targetDir = path.resolve(process.cwd(), dirPath);
        if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
          return [[], line];
        }

        const entries = fs.readdirSync(targetDir);
        const hits = entries
          .filter(e => e.startsWith(filePrefix))
          .map(e => {
            const relative = lastSlashIdx !== -1 ? `${dirPath}/${e}` : e;
            const fullPath = path.resolve(targetDir, e);
            return fs.statSync(fullPath).isDirectory() ? `${relative}/` : relative;
          });

        return [hits, line];
      } catch {
        return [[], line];
      }
    };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer,
    });

    rl.on('SIGINT', () => {
      rl.close();
      console.log();
      p.cancel('Analysis cancelled.');
      process.exit(0);
    });

    const promptText = `${pc.cyan('◇')}  ${message}\n${pc.cyan('│')}  ${pc.dim('Default:')} ${pc.yellow(defaultValue)} ${pc.dim('(Press Tab to autocomplete)')}\n${pc.cyan('└')}  `;
    rl.question(promptText, answer => {
      rl.close();
      const finalVal = answer.trim() || defaultValue;
      console.log(`${pc.cyan('│')}  ${pc.green(finalVal)}`);
      resolve(finalVal);
    });
  });
}

async function run() {
  const args = process.argv.slice(2);

  // Detect if run headlessly (e.g. from flags or CI/non-TTY environment)
  const isHeadless =
    args.includes('--headless') ||
    args.some(a => a.startsWith('--parser=')) ||
    args.some(a => a.startsWith('--glob=')) ||
    args.some(a => a.startsWith('--output=')) ||
    args.some(a => a.startsWith('--context=')) ||
    args.includes('--rollup-modules') ||
    args.some(a => a.startsWith('--ignore=')) ||
    args.some(a => a.startsWith('--systems=')) ||
    !process.stdout.isTTY ||
    process.env.CI;

  const fileConfig = loadAnalysisConfig(process.cwd());

  let parserType = 'ts-morph';
  let globPattern = fileConfig.glob || '**/*.{ts,tsx,cs,java,go}';
  let outputDir = process.env.BLUEPRINT_OUTPUT_DIR || 'blueprints';
  let contextName = fileConfig.context || 'Blueprint';
  let rollupModules = fileConfig.rollupModules;
  let cliIgnores: string[] = [];
  let cliSystems: string[] | undefined;

  // Headless flag overrides
  const parserArg = args.find(a => a.startsWith('--parser='));
  if (parserArg) {
    parserType = parserArg.split('=')[1];
  } else if (args.includes('--parser=tree-sitter')) {
    parserType = 'tree-sitter';
  }

  const globArg = args.find(a => a.startsWith('--glob='));
  if (globArg) {
    globPattern = globArg.split('=')[1];
  }

  const outputArg = args.find(a => a.startsWith('--output='));
  if (outputArg) {
    outputDir = outputArg.split('=')[1];
  }

  const contextArg = args.find(a => a.startsWith('--context='));
  if (contextArg) {
    contextName = contextArg.split('=')[1];
  }

  if (args.includes('--rollup-modules')) {
    rollupModules = true;
  }

  const ignoreArg = args.find(a => a.startsWith('--ignore='));
  if (ignoreArg) {
    cliIgnores = ignoreArg
      .slice('--ignore='.length)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  const systemsArg = args.find(a => a.startsWith('--systems='));
  if (systemsArg) {
    cliSystems = systemsArg
      .slice('--systems='.length)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  if (!isHeadless) {
    p.intro(`\n🔹 ${pc.bold(pc.cyan('blueprint'))}${pc.gray(' • system architecture generator')}`);

    if (fileConfig.configPath) {
      p.log.info(`Loaded config ${pc.dim(fileConfig.configPath)}`);
    }

    const selectedParser = await p.select({
      message: 'Select parser adapter:',
      options: [
        { value: 'ts-morph', label: 'ts-morph (Fast, static analysis)' },
        { value: 'tree-sitter', label: 'tree-sitter (High performance, multi-language)' },
      ],
      initialValue: parserType,
    });

    if (p.isCancel(selectedParser)) {
      p.cancel('Analysis cancelled.');
      process.exit(0);
    }
    parserType = selectedParser as string;

    const contextNameInput = await p.text({
      message: 'Enter context name:',
      placeholder: contextName,
      defaultValue: contextName,
    });

    if (p.isCancel(contextNameInput)) {
      p.cancel('Analysis cancelled.');
      process.exit(0);
    }
    contextName = (contextNameInput as string) || contextName;

    globPattern = await askPathWithTabComplete('Glob pattern/directory to scan:', globPattern);
    outputDir = await askPathWithTabComplete('Directory to output schemas:', outputDir);

    console.log(pc.cyan('│'));
  }

  const analysisOptions = mergeAnalysisOptions(fileConfig, {
    ignore: cliIgnores,
    include: fileConfig.include,
    systems: cliSystems,
    rollupModules,
  });

  const parser =
    parserType === 'tree-sitter'
      ? new TreeSitterParserAdapter(analysisOptions)
      : new TsMorphParserAdapter(analysisOptions);
  const layout = new DagreLayoutAdapter();
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  const analyzer = new CodebaseAnalyzer({
    parser,
    layout,
    fileSystem,
    logger,
    analysisOptions,
  });

  const spinner = isHeadless ? null : p.spinner();
  const cancellation = createCliCancellation();
  const disposeCancellation = cancellation.install();

  try {
    if (spinner) {
      spinner.start('Analyzing codebase structure… (Ctrl+C to cancel)');
    }
    const absoluteOutputDir = path.resolve(process.cwd(), outputDir);
    await analyzer.runAnalysis(contextName, outputDir, globPattern, cancellation.signal);
    if (spinner) {
      spinner.stop(
        pc.green(`Successfully generated visual layout levels inside: ${absoluteOutputDir}`)
      );
    }
  } catch (error) {
    if (isCancellationError(error)) {
      if (spinner) {
        spinner.stop(pc.yellow('Analysis cancelled'));
      } else {
        console.log(pc.yellow('\nAnalysis cancelled.'));
      }
      if (!isHeadless) {
        p.cancel('Analysis cancelled.');
      }
      process.exit(130);
    }

    if (spinner) {
      spinner.stop(pc.red('Failed to complete analysis'));
    }
    logger.error('Failed to run AST analysis', error);
    process.exit(1);
  } finally {
    disposeCancellation();
  }
}

run();
