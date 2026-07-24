import * as QueryParams from 'expo-auth-session/build/QueryParams';
import type { Session } from '@supabase/supabase-js';

import type { MurphySupabaseClient } from '@/services/supabase/client';

/**
 * Redirect paths this app registers with Supabase for its two email-link
 * flows (`Linking.createURL(path)` in `auth-context.tsx`, resolving to
 * `murphymethod://<path>` in a built/standalone app). Centralised here so
 * the deep-link handler and the code that sends the emails agree on exactly
 * one spelling of each path.
 */
export const SIGNUP_CONFIRMATION_REDIRECT_PATH = 'verify-email';
export const PASSWORD_RECOVERY_REDIRECT_PATH = 'reset-password';

export type AuthDeepLinkKind = 'signup' | 'recovery';

export type AuthDeepLinkResult =
  /** The URL isn't one of this app's auth email links — nothing to do. */
  | { outcome: 'ignored' }
  /** A session was established from the link's tokens/code. */
  | { outcome: 'established'; kind: AuthDeepLinkKind; session: Session }
  /**
   * The link matched an auth path but couldn't establish a session:
   * Supabase reported an error (expired/already-used link), the tokens/code
   * were missing (malformed/truncated link), or the exchange itself failed.
   * Deliberately carries no error detail — callers show generic, safe copy
   * (docs/IMPLEMENTATION_PLAN.md Phase 2 §17), never the raw reason.
   */
  | { outcome: 'failed'; kind: AuthDeepLinkKind };

function safeParseUrl(url: string): { host: string; pathname: string } {
  try {
    const parsed = new URL(url);
    return { host: parsed.host, pathname: parsed.pathname };
  } catch {
    return { host: '', pathname: '' };
  }
}

/**
 * Whether `url` targets `path`, across every URL shape this app's redirect
 * can arrive in: a custom-scheme URL (`murphymethod://reset-password`, where
 * WHATWG `URL` parses the path as the *host*, not the pathname) and Expo
 * Go's dev-client form (`exp://<host>/--/reset-password`).
 */
function pathMatches(url: string, path: string): boolean {
  const { host, pathname } = safeParseUrl(url);
  const combined = `${host}${pathname}`.replace(/\/+$/, '');
  return combined === path || combined.endsWith(`/${path}`);
}

/**
 * Processes an incoming URL that may be one of this app's two Supabase auth
 * email links (signup confirmation, password recovery), establishing the
 * session it carries.
 *
 * Supports both link formats Supabase can produce for the same email
 * action, depending on the client's `flowType`: implicit
 * `access_token`+`refresh_token` tokens (delivered as a URL hash fragment),
 * and PKCE `code` (delivered as a query parameter, exchanged via
 * `exchangeCodeForSession`). This client is configured for `flowType:
 * 'pkce'` (`services/supabase/client.ts`), so the `code` path is what a real
 * link takes; the token path is kept for defensiveness and is what this
 * function is exercised against in tests.
 *
 * Never logs the URL or any extracted token/code — only the classified
 * outcome is returned.
 */
export async function processAuthDeepLink(
  client: MurphySupabaseClient,
  url: string,
): Promise<AuthDeepLinkResult> {
  let pathKind: AuthDeepLinkKind | null = null;
  if (pathMatches(url, PASSWORD_RECOVERY_REDIRECT_PATH)) {
    pathKind = 'recovery';
  } else if (pathMatches(url, SIGNUP_CONFIRMATION_REDIRECT_PATH)) {
    pathKind = 'signup';
  }

  if (!pathKind) {
    return { outcome: 'ignored' };
  }

  const { params } = QueryParams.getQueryParams(url);

  // Supabase's own `type` param is the authoritative statement of what this
  // credential is for; the redirect path is what this app asked Supabase to
  // use for a given action and agrees with it in the normal case, but `type`
  // is trusted first so a recovery credential is never miscategorised as an
  // ordinary signed-in session under any circumstance (docs/ROUTES.md §3).
  const kind: AuthDeepLinkKind = params.type === 'recovery' ? 'recovery' : pathKind;

  if (params.error || params.error_code) {
    return { outcome: 'failed', kind };
  }

  if (typeof params.access_token === 'string' && typeof params.refresh_token === 'string') {
    const { data, error } = await client.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error || !data.session) {
      return { outcome: 'failed', kind };
    }
    return { outcome: 'established', kind, session: data.session };
  }

  if (typeof params.code === 'string') {
    const { data, error } = await client.auth.exchangeCodeForSession(params.code);
    if (error || !data.session) {
      return { outcome: 'failed', kind };
    }
    return { outcome: 'established', kind, session: data.session };
  }

  // Matched a known auth path but carried none of the expected params —
  // missing-token/malformed link.
  return { outcome: 'failed', kind };
}
