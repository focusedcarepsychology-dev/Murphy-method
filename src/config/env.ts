/**
 * Typed, validated environment configuration for the Supabase client
 * foundation (docs/IMPLEMENTATION_PLAN.md Phase 2). Both variables are
 * `EXPO_PUBLIC_*`, which Expo/Metro inline into the client bundle at build
 * time — this module must never read or accept a privileged/service-role
 * variable (see scripts/check-no-secrets.js for the build-artifact-level
 * enforcement of that rule).
 */

export type SupabaseEnvConfig = {
  readonly url: string;
  readonly publishableKey: string;
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Reads and validates the Supabase env contract. Accepts an explicit
 * `source` so tests can inject configuration directly rather than mutating
 * `process.env` (module-load order makes that unreliable in Jest). This
 * function must never be called with the entire `process.env` object — see
 * `runtimeSupabaseEnv` below for why. Returns `null` — never throws — on
 * missing or malformed configuration, so callers (and Jest) can render a
 * clear "not configured" state instead of crashing.
 */
export function readSupabaseEnvConfig(
  source: Partial<Record<string, string | undefined>>,
): SupabaseEnvConfig | null {
  const url = source.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }
  if (!isHttpUrl(url)) {
    return null;
  }

  return { url, publishableKey };
}

/**
 * Metro/Expo only inlines `EXPO_PUBLIC_*` variables at build time when they
 * appear as statically analyzable, direct `process.env.EXPO_PUBLIC_*`
 * member expressions — not when read off a variable holding `process.env`
 * (e.g. `readSupabaseEnvConfig(source = process.env)`), and not via
 * destructuring or bracket/dynamic access. Building this object literal
 * with direct dot-notation references is what makes the values survive
 * into the compiled bundle; do not refactor it to read from `process.env`
 * indirectly.
 */
const runtimeSupabaseEnv = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

export const supabaseEnvConfig = readSupabaseEnvConfig(runtimeSupabaseEnv);
export const isSupabaseConfigured = supabaseEnvConfig !== null;

if (typeof __DEV__ !== 'undefined' && __DEV__ && !isSupabaseConfigured) {
  // Development-only, clear failure signal — never a silent fallback to a
  // fake backend. Production builds surface the same absence of config via
  // ConfigurationErrorScreen (src/components/dev/configuration-error-screen.tsx)
  // rather than a console message alone.
  console.warn(
    '[murphy-method] Supabase is not configured: set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in a local .env file (see .env.example and ' +
      'docs/SUPABASE_SETUP.md). Authentication and all Supabase-backed features are ' +
      'unavailable until this is set.',
  );
}
