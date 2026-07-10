import * as fs from 'fs';
import * as path from 'path';
import type { AnalysisFileSystemPort } from '../domain/ports';

export class NodeFileSystemAdapter implements AnalysisFileSystemPort {
  async writeSchema(filePath: string, yamlContent: string): Promise<void> {
    fs.writeFileSync(filePath, yamlContent, 'utf8');
  }

  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  mkdir(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  unlink(filePath: string): void {
    fs.unlinkSync(filePath);
  }

  readPackageJsonName(packageJsonPath: string): string | null {
    try {
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return pkg.name || null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  getAbsolutePath(...parts: string[]): string {
    return path.resolve(...parts);
  }

  getCurrentWorkingDirectory(): string {
    return process.cwd();
  }
}
