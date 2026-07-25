const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');
const { defineConfig } = require('eslint/config');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', '.expo/*', 'expo-env.d.ts'],
  },
  {
    // Static guard against the Phase 1 preview-data leak returning
    // (docs/DECISIONS.md, "real-device remediation"). Development-only
    // fixtures must never be reachable from a route, a shared UI
    // component, or a service a real authenticated user renders: a
    // production or EAS preview build has no legitimate reason to import
    // anything under `src/dev/`.
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/services/**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/dev/*', '**/dev/preview*', '**/previewData*'],
              message:
                'Development preview fixtures must not be imported into authenticated app code. Read the real value from src/services/training/ (or show a truthful empty state) instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // Repo tooling scripts run under plain Node, not the Expo/RN runtime —
    // give them Node's globals (Buffer, process, __dirname, ...) rather
    // than the app source's browser/RN-oriented globals.
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
