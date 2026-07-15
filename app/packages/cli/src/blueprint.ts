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
import { parseBlueprintArgv, type BlueprintCliPlan } from './parseBlueprintArgv.ts';
import { collectFileMetrics } from './forensics/collectFileMetrics.ts';
import {
  applyInteractiveGitChoice,
  shouldPromptForGit,
  type InteractiveGitChoice,
} from './interactiveGitChoice.ts';
import { DEFAULT_FORENSICS_OPTIONS } from './forensics/domain/options.ts';
import type { FileMetrics } from './forensics/domain/types.ts';

async function promptInteractiveGit(): Promise<InteractiveGitChoice> {
  const mode = await p.select({
    message: 'Enrich blueprints with Git forensics (complexity, churn, ownership)?',
    options: [
      { value: 'none', label: 'No — architecture only' },
      { value: 'full', label: 'Yes — attach forensics onto systems and nodes' },
    ],
    initialValue: 'full',
  });

  if (p.isCancel(mode)) {
    p.cancel('Analysis cancelled.');
    process.exit(0);
  }

  if (mode === 'none') {
    return { mode: 'none' };
  }

  const sinceInput = await p.text({
    message: 'Git lookback window (days):',
    placeholder: String(DEFAULT_FORENSICS_OPTIONS.sinceDays),
    defaultValue: String(DEFAULT_FORENSICS_OPTIONS.sinceDays),
  });

  if (p.isCancel(sinceInput)) {
    p.cancel('Analysis cancelled.');
    process.exit(0);
  }

  const parsed = Number(String(sinceInput).replace(/d$/i, '').trim());
  const sinceDays =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FORENSICS_OPTIONS.sinceDays;

  return { mode: 'full', sinceDays };
}

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

async function runArchitecture(plan: BlueprintCliPlan): Promise<{
  plan: BlueprintCliPlan;
  forensicsByPath?: Map<string, FileMetrics>;
}> {
  const isHeadless = plan.isHeadless;
  const fileConfig = loadAnalysisConfig(process.cwd());
  let resolvedPlan = plan;

  let parserType = plan.architecture.parserType || 'ts-morph';
  let globPattern = plan.architecture.glob || fileConfig.glob || '**/*.{ts,tsx,cs,java,go}';
  let outputDir = plan.architecture.outputDir || process.env.BLUEPRINT_OUTPUT_DIR || 'blueprints';
  let contextName = plan.architecture.context || fileConfig.context || 'Blueprint';
  let rollupModules = plan.architecture.rollupModules || fileConfig.rollupModules;
  let cliIgnores = plan.architecture.ignore;
  let cliSystems = plan.architecture.systems;

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

    if (shouldPromptForGit(resolvedPlan)) {
      resolvedPlan = applyInteractiveGitChoice(resolvedPlan, await promptInteractiveGit());
    }

    console.log(pc.cyan('│'));
  }

  let forensicsByPath: Map<string, FileMetrics> | undefined;
  if (resolvedPlan.runGitForensics) {
    const logger = new ConsoleLogger();
    try {
      if (!isHeadless) {
        p.log.info('Collecting Git forensics metrics…');
      }
      forensicsByPath = await collectFileMetrics(resolvedPlan.git);
    } catch (error) {
      logger.error('Failed to collect Git forensics', error);
      process.exit(1);
    }
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
      spinner.start(
        forensicsByPath
          ? 'Analyzing codebase + Git forensics… (Ctrl+C to cancel)'
          : 'Analyzing codebase structure… (Ctrl+C to cancel)'
      );
    }
    const absoluteOutputDir = path.resolve(process.cwd(), outputDir);
    await analyzer.runAnalysis(contextName, outputDir, globPattern, cancellation.signal, {
      forensicsByPath,
    });
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

  return { plan: resolvedPlan, forensicsByPath };
}

async function run() {
  const args = process.argv.slice(2);
  const plan = parseBlueprintArgv(args);
  await runArchitecture(plan);
}

run();
