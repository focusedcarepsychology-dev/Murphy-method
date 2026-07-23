#!/usr/bin/env node

/**
 * Secret-leak prevention (docs/IMPLEMENTATION_PLAN.md Phase 2 §15,
 * docs/ACCEPTANCE_CRITERIA.md #3). Defence in depth, not a single exact
 * string check:
 *
 *  1. No `EXPO_PUBLIC_*` environment variable name looks privileged
 *     (contains SERVICE/SECRET/PRIVATE/ADMIN/PASSWORD/TOKEN) anywhere in
 *     source or env files — an EXPO_PUBLIC_ variable is inlined into the
 *     client bundle by Metro, so a privileged-looking name in that
 *     position is a real bug regardless of its actual value.
 *  2. No JWT-shaped string decodes to a `service_role` (or other
 *     non-`anon`/`authenticated`) role claim, in source, env files, or
 *     (when present) the exported web bundle.
 *  3. No literal Supabase secret-key-prefixed string (`sb_secret_`) appears
 *     anywhere scanned.
 *  4. `.env` (real credentials) is never committed to git — only
 *     `.env.example` (placeholders) is tracked.
 *
 * Usage: node scripts/check-no-secrets.js [--bundle-dir <dir>]
 * Exits non-zero on any finding.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const SOURCE_SCAN_DIRS = ['src', 'scripts', 'jest', 'supabase/tests'];
const SOURCE_SCAN_FILES = ['app.json', '.env.example', 'package.json'];
const TEXT_FILE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.env',
  '.example',
  '.html',
  '.map',
]);

const PRIVILEGED_ENV_NAME_PATTERN =
  /EXPO_PUBLIC_[A-Z0-9_]*(SERVICE|SECRET|PRIVATE|ADMIN|PASSWORD|TOKEN)[A-Z0-9_]*/g;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const SECRET_KEY_PREFIX_PATTERN = /\bsb_secret_[A-Za-z0-9_-]+/g;

let findings = [];

function base64UrlDecode(segment) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  return Buffer.from(withPadding, 'base64').toString('utf8');
}

function checkJwtRole(jwt, filePath) {
  const parts = jwt.split('.');
  if (parts.length < 2) return;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (payload && typeof payload.role === 'string' && payload.role !== 'anon') {
      findings.push(
        `${filePath}: JWT decodes to role "${payload.role}" — only an "anon"-role key belongs in client code/bundles.`,
      );
    }
  } catch {
    // Not a decodable JWT payload — not our concern here (§2 is a
    // best-effort defence against accidental real-key pastes, not a
    // general JWT validator).
  }
}

function scanFileContents(filePath, contents) {
  const privilegedNames = contents.match(PRIVILEGED_ENV_NAME_PATTERN);
  if (privilegedNames) {
    for (const name of new Set(privilegedNames)) {
      findings.push(
        `${filePath}: privileged-looking EXPO_PUBLIC_ variable name "${name}" — EXPO_PUBLIC_* is inlined into the client bundle.`,
      );
    }
  }

  const secretPrefixed = contents.match(SECRET_KEY_PREFIX_PATTERN);
  if (secretPrefixed) {
    findings.push(`${filePath}: contains a literal sb_secret_ prefixed value.`);
  }

  const jwts = contents.match(JWT_PATTERN);
  if (jwts) {
    for (const jwt of jwts) {
      checkJwtRole(jwt, filePath);
    }
  }
}

function walk(startPath, visit) {
  if (!fs.existsSync(startPath)) return;
  const stat = fs.statSync(startPath);
  if (stat.isDirectory()) {
    if (path.basename(startPath) === 'node_modules') return;
    for (const entry of fs.readdirSync(startPath)) {
      walk(path.join(startPath, entry), visit);
    }
    return;
  }
  visit(startPath);
}

function scanPath(targetPath, { textOnly } = { textOnly: true }) {
  walk(path.join(ROOT, targetPath), (filePath) => {
    const ext = path.extname(filePath);
    if (textOnly && ext && !TEXT_FILE_EXTENSIONS.has(ext)) return;
    let contents;
    try {
      contents = fs.readFileSync(filePath, 'utf8');
    } catch {
      return; // binary or unreadable — skip rather than crash the check
    }
    scanFileContents(path.relative(ROOT, filePath), contents);
  });
}

function checkEnvNotCommitted() {
  let trackedFiles;
  try {
    trackedFiles = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    console.warn(
      'check-no-secrets: not a git checkout (or git unavailable) — skipping .env-committed check.',
    );
    return;
  }

  const committedEnvFiles = trackedFiles.filter(
    (file) => /(^|\/)\.env($|\.[^.]+$)/.test(file) && !file.endsWith('.env.example'),
  );
  for (const file of committedEnvFiles) {
    findings.push(
      `${file}: a real .env file is committed to git — only .env.example should be tracked.`,
    );
  }
}

function main() {
  const bundleDirArgIndex = process.argv.indexOf('--bundle-dir');
  const bundleDir = bundleDirArgIndex !== -1 ? process.argv[bundleDirArgIndex + 1] : null;

  for (const dir of SOURCE_SCAN_DIRS) {
    scanPath(dir);
  }
  for (const file of SOURCE_SCAN_FILES) {
    scanPath(file);
  }
  checkEnvNotCommitted();

  if (bundleDir) {
    if (fs.existsSync(path.join(ROOT, bundleDir))) {
      scanPath(bundleDir, { textOnly: false });
      console.log(`check-no-secrets: scanned build artifact directory "${bundleDir}".`);
    } else {
      console.warn(
        `check-no-secrets: --bundle-dir "${bundleDir}" does not exist — skipping build-artifact scan. ` +
          'Run `npx expo export --platform web` first to produce it.',
      );
    }
  } else {
    console.warn(
      'check-no-secrets: no --bundle-dir given — skipping the build-artifact scan (source/env-only check). ' +
        'CI additionally runs this against the exported web bundle.',
    );
  }

  findings = [...new Set(findings)];

  if (findings.length > 0) {
    console.error('\ncheck-no-secrets: FAILED — potential secret exposure found:\n');
    for (const finding of findings) {
      console.error(`  - ${finding}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log('check-no-secrets: OK — no privileged credentials found in scanned locations.');
}

main();
