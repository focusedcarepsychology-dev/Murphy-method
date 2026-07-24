/**
 * Supabase client foundation (docs/IMPLEMENTATION_PLAN.md Phase 2).
 *
 * This module is client-safe by construction: it only ever receives the
 * public URL + publishable key (src/config/env.ts), never a service-role
 * key or any other privileged credential. Privileged operations (Level 2+
 * adaptation, AI provider calls, cross-user aggregate work) belong in
 * Supabase Edge Functions, never here (docs/ARCHITECTURE.md §6).
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import { supabaseEnvConfig } from '@/config/env';
import type { Database } from '@/types/database';

export type MurphySupabaseClient = SupabaseClient<Database>;

let client: MurphySupabaseClient | null = null;
let appStateListener: { remove: () => void } | null = null;

function handleAppStateChange(instance: MurphySupabaseClient, state: AppStateStatus): void {
  // Foreground/background handling per the official Supabase Expo/React
  // Native guidance: auto-refresh must be explicitly paused/resumed, since
  // there is no browser tab-visibility event to drive it on native.
  if (state === 'active') {
    instance.auth.startAutoRefresh();
  } else {
    instance.auth.stopAutoRefresh();
  }
}

/**
 * Returns the single shared Supabase client, creating it on first call.
 * Never call `createClient` directly elsewhere — a new client per render/
 * call would duplicate auth state and AppState subscriptions.
 *
 * Throws if Supabase isn't configured (src/config/env.ts). Callers must
 * check `isSupabaseConfigured` first and render the
 * ConfigurationErrorScreen state instead of reaching this call — this
 * function deliberately does not fall back to a fake/mock backend.
 */
export function getSupabaseClient(): MurphySupabaseClient {
  if (client) {
    return client;
  }
  if (!supabaseEnvConfig) {
    throw new Error(
      'getSupabaseClient() called without Supabase configuration. Check ' +
        'isSupabaseConfigured (src/config/env.ts) before calling this.',
    );
  }

  client = createClient<Database>(supabaseEnvConfig.url, supabaseEnvConfig.publishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // `detectSessionInUrl` drives supabase-js's own browser-only
      // URL-parsing/history-cleanup behaviour, which does not exist on
      // native — the app's incoming-link handling
      // (`state/auth/process-auth-deep-link.ts`, wired in
      // `state/auth/auth-context.tsx`) reads the URL itself via
      // `expo-linking` and establishes the session explicitly, so this
      // must stay `false` on native regardless.
      detectSessionInUrl: false,
      // PKCE over the implicit flow for both email links this app sends
      // (signup confirmation, password recovery): the emailed link then
      // carries a single-use `code` query param instead of raw
      // access/refresh tokens in a URL fragment, per current Supabase
      // guidance for native/mobile apps.
      flowType: 'pkce',
    },
  });

  if (!appStateListener) {
    const subscription = AppState.addEventListener('change', (state) =>
      handleAppStateChange(client!, state),
    );
    appStateListener = subscription;
  }

  return client;
}

/**
 * Test-only reset of the module-level singleton, so each test file gets a
 * fresh client/mock rather than leaking state across tests. Not used by
 * application code.
 */
export function __resetSupabaseClientForTests(): void {
  client = null;
  appStateListener?.remove();
  appStateListener = null;
}
