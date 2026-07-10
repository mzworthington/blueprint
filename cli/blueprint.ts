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
    !process.stdout.isTTY ||
    process.env.CI;

  let parserType = 'ts-morph';
  let globPattern = '**/*.{ts,tsx,cs,java,go}';
  let outputDir = process.env.BLUEPRINT_OUTPUT_DIR || 'blueprints';

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

  if (!isHeadless) {
    p.intro(`\n🔹 ${pc.bold(pc.cyan('blueprint'))}${pc.gray(' • system architecture generator')}`);

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

    globPattern = await askPathWithTabComplete('Glob pattern/directory to scan:', globPattern);
    outputDir = await askPathWithTabComplete('Directory to output schemas:', outputDir);

    console.log(pc.cyan('│'));
  }

  const parser =
    parserType === 'tree-sitter' ? new TreeSitterParserAdapter() : new TsMorphParserAdapter();
  const layout = new DagreLayoutAdapter();
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  const analyzer = new CodebaseAnalyzer({
    parser,
    layout,
    fileSystem,
    logger,
  });

  const spinner = isHeadless ? null : p.spinner();

  try {
    if (spinner) {
      spinner.start('Analyzing codebase structure...');
    }
    await analyzer.runAnalysis(globPattern, outputDir);
    if (spinner) {
      spinner.stop(pc.green('Successfully generated visual layout levels!'));
    }
  } catch (error) {
    if (spinner) {
      spinner.stop(pc.red('Failed to complete analysis'));
    }
    logger.error('Failed to run AST analysis', error);
    process.exit(1);
  }
}

run();
