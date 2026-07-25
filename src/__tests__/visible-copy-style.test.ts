declare const __dirname: string;
declare function require(id: 'fs'): {
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: 'utf8'): string;
  statSync(path: string): { isDirectory(): boolean };
};
declare function require(id: 'path'): { join(...parts: string[]): string };

const { readdirSync, readFileSync, statSync } = require('fs');
const { join } = require('path');
const SRC = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  function walk(current: string) {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== '__tests__') walk(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        found.push(full);
      }
    }
  }
  walk(join(SRC, dir));
  return found;
}

function withoutCommentsAndImports(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^import[\s\S]*?;\s*$/gm, '');
}

const visibleSource = [
  ...sourceFiles('app'),
  ...sourceFiles('components'),
  ...sourceFiles('domain'),
  ...sourceFiles('services'),
];

describe('visible copy style', () => {
  it('contains no em or en dashes outside comments and imports', () => {
    const offenders = visibleSource.filter((file) =>
      /[—–]/.test(withoutCommentsAndImports(readFileSync(file, 'utf8'))),
    );
    expect(offenders).toEqual([]);
  });

  it('does not expose generated-product clichés or internal AI labels', () => {
    const pattern =
      /\b(?:AI[- ]powered|AI processing|adaptive coach|unlock your potential|seamless journey|game[- ]changing|revolutionary)\b/i;
    const offenders = visibleSource.filter((file) =>
      pattern.test(withoutCommentsAndImports(readFileSync(file, 'utf8'))),
    );
    expect(offenders).toEqual([]);
  });
});
