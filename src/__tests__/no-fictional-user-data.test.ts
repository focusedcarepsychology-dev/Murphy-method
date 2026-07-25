/**
 * INVARIANT F (docs/ACCEPTANCE_CRITERIA.md): authenticated production
 * routes cannot rely on development preview fixtures as user data.
 *
 * This is a static source scan, deliberately independent of the ESLint
 * `no-restricted-imports` guard in `eslint.config.js` — two mechanisms,
 * because the whole class of defect this remediation fixed was a
 * fictional-data module quietly reaching a real signed-in user on a real
 * device. It also catches the shape of the leak that survived the first
 * time: literal fabricated personal values pasted straight into a screen.
 */

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

function sourceFilesUnder(relativeDir: string): string[] {
  const root = join(SRC, relativeDir);
  const found: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(full);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry)) found.push(full);
    }
  }
  walk(root);
  return found;
}

const AUTHENTICATED_SOURCE = [
  ...sourceFilesUnder('app'),
  ...sourceFilesUnder('components'),
  ...sourceFilesUnder('services'),
  ...sourceFilesUnder('hooks'),
];

function relative(file: string): string {
  return file.slice(SRC.length + 1);
}

function stripCommentsAndImports(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^import[\s\S]*?;\s*$/gm, '');
}

describe('authenticated source contains no fictional user data', () => {
  it('scans a non-trivial number of files', () => {
    expect(AUTHENTICATED_SOURCE.length).toBeGreaterThan(50);
  });

  it('imports nothing from a development preview/fixture module', () => {
    const offenders = AUTHENTICATED_SOURCE.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /from\s+['"](@\/dev\/|.*\/dev\/preview|.*previewData)/.test(source);
    }).map(relative);

    expect(offenders).toEqual([]);
  });

  it('does not reference a preview workout identifier', () => {
    const offenders = AUTHENTICATED_SOURCE.filter((file) =>
      /preview-workout|PREVIEW_WORKOUT_ID/.test(
        stripCommentsAndImports(readFileSync(file, 'utf8')),
      ),
    ).map(relative);

    expect(offenders).toEqual([]);
  });

  it('never hard-codes a personal name for the signed-in user', () => {
    const offenders = AUTHENTICATED_SOURCE.filter((file) =>
      /\bfirstName\b|['"]Alex['"]/.test(readFileSync(file, 'utf8')),
    ).map(relative);

    expect(offenders).toEqual([]);
  });

  it('never hard-codes previous lifting performance or personal records', () => {
    const literalPerformance = /['"][^'"\n]*\b\d+\s?kg\s*[×x]\s*\d+/i;
    const offenders = AUTHENTICATED_SOURCE.filter((file) =>
      literalPerformance.test(readFileSync(file, 'utf8')),
    ).map(relative);

    expect(offenders).toEqual([]);
  });

  it('never hard-codes a completion percentage or session tally', () => {
    const offenders = AUTHENTICATED_SOURCE.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return (
        /\b82\s?%|\{\s*82\s*\}%/.test(source) ||
        /['"]\s*\d+\s+of\s+\d+\s+planned/.test(source) ||
        /completedSessions=\{\s*\d/.test(source) ||
        /plannedSessions=\{\s*\d/.test(source)
      );
    }).map(relative);

    expect(offenders).toEqual([]);
  });

  it('does not expose internal roadmap or placeholder language to users', () => {
    const userFacingDevelopmentLanguage =
      /\b(?:phase\s+\d+|wired\s+in|lands\s+in\s+phase|preview\s+data|placeholder\s+screen)\b/i;
    const offenders = AUTHENTICATED_SOURCE.filter((file) =>
      userFacingDevelopmentLanguage.test(stripCommentsAndImports(readFileSync(file, 'utf8'))),
    ).map(relative);

    expect(offenders).toEqual([]);
  });

  it('has no development preview fixture module left in the source tree', () => {
    const previewModules = [
      ...sourceFilesUnder('app'),
      ...sourceFilesUnder('components'),
      ...sourceFilesUnder('services'),
      ...sourceFilesUnder('hooks'),
      ...sourceFilesUnder('domain'),
    ].filter((file) => /preview(Data|User|Workout)/i.test(file));

    expect(previewModules.map(relative)).toEqual([]);
  });
});
