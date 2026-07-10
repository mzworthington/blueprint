import { Project, SyntaxKind, ImportDeclaration, NewExpression, CallExpression } from 'ts-morph';
import * as path from 'path';
import type { CodebaseParserPort } from '../domain/ports.ts';
import type { ParsedSourceFile } from '../domain/types.ts';

export class TsMorphParserAdapter implements CodebaseParserPort {
  async parseSourceFiles(globPattern: string): Promise<ParsedSourceFile[]> {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths(path.resolve(process.cwd(), globPattern));

    const sourceFiles = project.getSourceFiles();
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
