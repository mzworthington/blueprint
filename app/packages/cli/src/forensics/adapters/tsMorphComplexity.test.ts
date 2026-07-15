import { describe, expect, it } from 'vitest';
import { countCyclomaticComplexity, countLocAndSloc } from './tsMorphComplexity.ts';
import { Project } from 'ts-morph';

describe('countLocAndSloc', () => {
  it('counts physical and source lines', () => {
    const text = ['a', '', '// comment', 'b', '/*', 'block', '*/', 'c'].join('\n');
    const { loc, sloc } = countLocAndSloc(text);
    expect(loc).toBe(8);
    expect(sloc).toBe(3);
  });
});

describe('countCyclomaticComplexity', () => {
  it('counts decision points from a fixture', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sf = project.createSourceFile(
      'fixture.ts',
      `
export function f(a: number, b: number) {
  if (a && b) return a ? 1 : 2;
  for (const x of []) {}
  while (false) {}
  try { throw 0; } catch { }
  switch (a) { case 1: break; case 2: break; default: break; }
}
`
    );
    // base 1 + if + && + ternary + for + while + catch + case + case = 9
    expect(countCyclomaticComplexity(sf)).toBe(9);
  });
});
