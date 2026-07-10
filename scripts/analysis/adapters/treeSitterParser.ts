import Parser from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs';
import type { CodebaseParserPort } from '../domain/ports.ts';
import type { ParsedSourceFile } from '../domain/types.ts';

export class TreeSitterParserAdapter implements CodebaseParserPort {
  private static initPromise: Promise<void> | null = null;
  private loadedLanguages = new Map<string, Parser.Language>();

  private static async initTreeSitter() {
    if (!this.initPromise) {
      this.initPromise = Parser.init();
    }
    await this.initPromise;
  }

  private async getLanguage(ext: string): Promise<Parser.Language | null> {
    const langKey = this.getLanguageKey(ext);
    if (!langKey) return null;

    if (this.loadedLanguages.has(langKey)) {
      return this.loadedLanguages.get(langKey)!;
    }

    const wasmName = `tree-sitter-${langKey}.wasm`;
    const wasmPath = path.resolve(process.cwd(), 'node_modules/tree-sitter-wasms/out', wasmName);

    if (!fs.existsSync(wasmPath)) {
      return null;
    }

    // In web-tree-sitter, we access Language static property on Parser after init completes
    const lang = await Parser.Language.load(wasmPath);
    this.loadedLanguages.set(langKey, lang);
    return lang;
  }

  private getLanguageKey(ext: string): string | null {
    switch (ext) {
      case '.ts':
        return 'typescript';
      case '.tsx':
        return 'tsx';
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.py':
        return 'python';
      case '.go':
        return 'go';
      case '.java':
        return 'java';
      case '.cs':
        return 'c_sharp';
      default:
        return null;
    }
  }

  private parseGlobPattern(pattern: string): { dir: string; extensions: string[] } {
    const resolvedPattern = path.resolve(process.cwd(), pattern);
    const baseDir = resolvedPattern.split('**')[0].replace(/\/$/, '').replace(/\\$/, '');

    const extMatch = resolvedPattern.match(/\{([^}]+)\}/);
    let extensions: string[] = [];
    if (extMatch) {
      extensions = extMatch[1].split(',').map(e => '.' + e.trim().replace(/^\./, ''));
    } else {
      const singleExtMatch = resolvedPattern.match(/\.([a-zA-Z0-9]+)$/);
      if (singleExtMatch) {
        extensions = ['.' + singleExtMatch[1]];
      }
    }

    if (extensions.length === 0) {
      extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go'];
    }

    return {
      dir: baseDir || path.resolve(process.cwd(), 'src'),
      extensions,
    };
  }

  private getFilesRecursively(dir: string, extensions: string[]): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && !file.startsWith('.')) {
          results.push(...this.getFilesRecursively(filePath, extensions));
        }
      } else {
        const ext = path.extname(file).toLowerCase();
        if (extensions.includes(ext)) {
          results.push(filePath);
        }
      }
    });
    return results;
  }

  async parseSourceFiles(globPattern: string): Promise<ParsedSourceFile[]> {
    await TreeSitterParserAdapter.initTreeSitter();

    const { dir, extensions } = this.parseGlobPattern(globPattern);
    const matchedFiles = this.getFilesRecursively(dir, extensions);

    const result: ParsedSourceFile[] = [];
    const parser = new Parser();

    for (const filePath of matchedFiles) {
      const ext = path.extname(filePath).toLowerCase();
      const lang = await this.getLanguage(ext);
      if (!lang) continue;

      parser.setLanguage(lang);

      const content = fs.readFileSync(filePath, 'utf8');
      const tree = parser.parse(content);

      const relativePath = path.relative(process.cwd(), filePath);
      const baseName = path.basename(relativePath, path.extname(relativePath));
      const isTestFile = relativePath.includes('.test.') || relativePath.includes('setupTests');

      const imports: { moduleSpecifier: string }[] = [];
      const newExpressions: { className: string }[] = [];
      const callExpressions: string[] = [];
      const namespaces: string[] = [];

      const walk = (node: Parser.SyntaxNode) => {
        // --- TypeScript/JavaScript parser logic ---
        if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
          if (node.type === 'import_statement') {
            const literalNode =
              node.childForFieldName('source') || node.descendantsOfType('literal')[0];
            if (literalNode) {
              imports.push({ moduleSpecifier: literalNode.text.replace(/['"`]/g, '') });
            }
          }
          if (node.type === 'new_expression') {
            const constructorNode = node.childForFieldName('constructor');
            if (constructorNode) {
              newExpressions.push({ className: constructorNode.text });
            }
          }
          if (node.type === 'call_expression') {
            const fnNode = node.childForFieldName('function');
            if (fnNode) {
              callExpressions.push(fnNode.text);
            }
          }
        }

        // --- Python parser logic ---
        if (ext === '.py') {
          if (node.type === 'import_statement') {
            node.descendantsOfType('dotted_name').forEach(n => {
              imports.push({ moduleSpecifier: n.text });
            });
          }
          if (node.type === 'import_from_statement') {
            const sourceNode =
              node.childForFieldName('module_name') || node.descendantsOfType('dotted_name')[0];
            if (sourceNode) {
              imports.push({ moduleSpecifier: sourceNode.text });
            }
          }
          if (node.type === 'call') {
            const fnNode = node.childForFieldName('function');
            if (fnNode) {
              callExpressions.push(fnNode.text);
              const firstChar = fnNode.text.charAt(0);
              if (firstChar >= 'A' && firstChar <= 'Z') {
                newExpressions.push({ className: fnNode.text });
              }
            }
          }
        }

        // --- C# parser logic ---
        if (ext === '.cs') {
          if (node.type === 'using_directive') {
            const nameNode =
              node.childForFieldName('name') ||
              node.descendantsOfType(['qualified_name', 'identifier'])[0];
            if (nameNode) {
              imports.push({ moduleSpecifier: nameNode.text });
            }
          }
          if (node.type === 'object_creation_expression') {
            const typeNode =
              node.childForFieldName('type') || node.descendantsOfType('identifier')[0];
            if (typeNode) {
              newExpressions.push({ className: typeNode.text });
            }
          }
          if (node.type === 'parameter') {
            const typeNode = node.childForFieldName('type');
            if (typeNode) {
              newExpressions.push({ className: typeNode.text });
            }
          }
          if (node.type === 'field_declaration' || node.type === 'property_declaration') {
            const typeNode = node.childForFieldName('type');
            if (typeNode) {
              newExpressions.push({ className: typeNode.text });
            }
          }
          if (node.type === 'invocation_expression') {
            const fnNode = node.child(0);
            if (fnNode) {
              callExpressions.push(fnNode.text);
            }
          }
          if (
            node.type === 'namespace_declaration' ||
            node.type === 'file_scoped_namespace_declaration'
          ) {
            const nameNode =
              node.childForFieldName('name') ||
              node.descendantsOfType(['qualified_name', 'identifier'])[0];
            if (nameNode) {
              namespaces.push(nameNode.text);
            }
          }
        }

        // Recursively walk children
        for (let i = 0; i < node.childCount; i++) {
          walk(node.child(i)!);
        }
      };

      walk(tree.rootNode);

      result.push({
        filePath,
        relativePath,
        baseName,
        isTestFile,
        imports,
        newExpressions,
        callExpressions,
        namespaces,
      });
    }

    return result;
  }
}
