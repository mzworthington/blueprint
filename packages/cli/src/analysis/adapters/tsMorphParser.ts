import { Project, SyntaxKind, ImportDeclaration, NewExpression, CallExpression } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import type { CodebaseParserPort } from '@blueprint/core';
import type { ParsedSourceFile } from '../domain/types.ts';

export class TsMorphParserAdapter implements CodebaseParserPort {
  async parseSourceFiles(globPattern: string): Promise<ParsedSourceFile[]> {
    const tsConfigPath = path.resolve(process.cwd(), 'tsconfig.json');
    const project = new Project(
      fs.existsSync(tsConfigPath)
        ? {
            tsConfigFilePath: tsConfigPath,
            skipAddingFilesFromTsConfig: true,
          }
        : {}
    );

    const resolvedPattern = path.resolve(process.cwd(), globPattern);
    project.addSourceFilesAtPaths([
      resolvedPattern,
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.git/**',
    ]);

    const sourceFiles = project.getSourceFiles().filter(sf => {
      const fp = sf.getFilePath().replace(/\\/g, '/');
      return !fp.includes('/node_modules/') && !fp.includes('/dist/') && !fp.includes('/.git/');
    });
    const result: ParsedSourceFile[] = [];

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      const relativePath = path.relative(process.cwd(), filePath);
      const baseName = path.basename(relativePath, path.extname(relativePath));
      const isTestFile = relativePath.includes('.test.') || relativePath.includes('setupTests');

      const imports = sourceFile.getImportDeclarations().map((imp: ImportDeclaration) => ({
        moduleSpecifier: imp.getModuleSpecifierValue(),
      }));

      const newExpressions = sourceFile
        .getDescendantsOfKind(SyntaxKind.NewExpression)
        .map((newExpr: NewExpression) => ({
          className: newExpr.getExpression().getText(),
        }));

      const callExpressions = sourceFile
        .getDescendantsOfKind(SyntaxKind.CallExpression)
        .map((callExpr: CallExpression) => callExpr.getExpression().getText());

      result.push({
        filePath,
        relativePath,
        baseName,
        isTestFile,
        imports,
        newExpressions,
        callExpressions,
        namespaces: [],
      });
    }

    return result;
  }
}
