export function resolveRelativePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/') || relativePath.includes('://')) {
    return relativePath;
  }
  const parts = basePath.split('/');
  parts.pop();
  const relParts = relativePath.split('/');
  for (const part of relParts) {
    if (part === '.') continue;
    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
}

export const getFileName = (filePath: string) => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};
