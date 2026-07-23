#!/usr/bin/env node

/**
 * `expo-env.d.ts` provides the ambient type declarations Expo needs for
 * TypeScript (including CSS/CSS-module imports on web) via
 * `/// <reference types="expo/types" />`. Expo's own tooling normally
 * writes this file the first time `expo start` runs, and it is
 * intentionally git-ignored (see .gitignore) so it is never committed.
 *
 * That means a fresh checkout that runs `tsc` before ever starting the
 * dev server is missing it, and `npm run typecheck` fails on the CSS
 * imports in src/components/animated-icon.web.tsx and
 * src/constants/theme.ts even though the source is correct. This script
 * reproduces Expo's own generated file deterministically so `npm run
 * typecheck` is self-sufficient right after `npm install`, without
 * requiring the Metro dev server to have run first.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE = `/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore
`;

const target = path.join(process.cwd(), 'expo-env.d.ts');

if (!fs.existsSync(target)) {
  fs.writeFileSync(target, TEMPLATE);
}
