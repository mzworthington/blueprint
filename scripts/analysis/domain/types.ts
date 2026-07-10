import type { SystemNode, SystemDependency } from '../../../src/domain/schema';

export interface ParsedImport {
  moduleSpecifier: string;
}

export interface ParsedNewExpression {
  className: string;
}

export interface ParsedSourceFile {
  filePath: string;
  relativePath: string;
  baseName: string;
  isTestFile: boolean;
  imports: ParsedImport[];
  newExpressions: ParsedNewExpression[];
  callExpressions: string[];
}

export interface CodebaseAnalysisConfig {
  sourcePathsGlob: string;
  tsConfigPath: string;
}
