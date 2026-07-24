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
 * `process.env` (module-load order makes that unreliable in Jest).
 * Returns `null` — never throws — on missing or malformed configuration, so
 * callers (and Jest) can render a clear "not configured" state instead of
 * crashing.
 */
export function readSupabaseEnvConfig(
  source: Partial<Record<string, string | undefined>> = process.env,
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

export const supabaseEnvConfig = readSupabaseEnvConfig();
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
