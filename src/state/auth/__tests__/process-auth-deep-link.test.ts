import {
  processAuthDeepLink,
  PASSWORD_RECOVERY_REDIRECT_PATH,
  SIGNUP_CONFIRMATION_REDIRECT_PATH,
} from '@/state/auth/process-auth-deep-link';
import { createMockSession, createMockSupabaseClient } from '@/test-utils/mock-supabase-client';

const SENTINEL_ACCESS_TOKEN = 'sentinel-access-token-should-never-be-logged';
const SENTINEL_REFRESH_TOKEN = 'sentinel-refresh-token-should-never-be-logged';
const SENTINEL_CODE = 'sentinel-pkce-code-should-never-be-logged';

describe('processAuthDeepLink', () => {
  it("is a no-op for a URL that is not one of this app's auth links (ignored)", async () => {
    const mock = createMockSupabaseClient();

    const result = await processAuthDeepLink(mock.client, 'murphymethod://workout/123');

    expect(result).toEqual({ outcome: 'ignored' });
    expect(mock.auth.setSession).not.toHaveBeenCalled();
    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('is a no-op for the bare app URL with no path at all', async () => {
    const mock = createMockSupabaseClient();

    const result = await processAuthDeepLink(mock.client, 'murphymethod://');

    expect(result).toEqual({ outcome: 'ignored' });
  });

  describe(`${SIGNUP_CONFIRMATION_REDIRECT_PATH} (signup confirmation)`, () => {
    it('exchanges a PKCE code and establishes a normal authenticated session', async () => {
      const mock = createMockSupabaseClient();
      const session = createMockSession();
      mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      const result = await processAuthDeepLink(
        mock.client,
        `murphymethod://${SIGNUP_CONFIRMATION_REDIRECT_PATH}?code=${SENTINEL_CODE}`,
      );

      expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith(SENTINEL_CODE);
      expect(result).toEqual({ outcome: 'established', kind: 'signup', session });
    });

    it('establishes a session from access/refresh tokens (implicit-flow fallback)', async () => {
      const mock = createMockSupabaseClient();
      const session = createMockSession();
      mock.auth.setSession.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      const result = await processAuthDeepLink(
        mock.client,
        `murphymethod://${SIGNUP_CONFIRMATION_REDIRECT_PATH}#access_token=${SENTINEL_ACCESS_TOKEN}&refresh_token=${SENTINEL_REFRESH_TOKEN}&type=signup`,
      );

      expect(mock.auth.setSession).toHaveBeenCalledWith({
        access_token: SENTINEL_ACCESS_TOKEN,
        refresh_token: SENTINEL_REFRESH_TOKEN,
      });
      expect(result).toEqual({ outcome: 'established', kind: 'signup', session });
    });
  });

  describe(`${PASSWORD_RECOVERY_REDIRECT_PATH} (password recovery)`, () => {
    it('exchanges a PKCE code and reports kind: recovery (from the path, no type param)', async () => {
      const mock = createMockSupabaseClient();
      const session = createMockSession();
      mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      const result = await processAuthDeepLink(
        mock.client,
        `murphymethod://${PASSWORD_RECOVERY_REDIRECT_PATH}?code=${SENTINEL_CODE}`,
      );

      expect(result).toEqual({ outcome: 'established', kind: 'recovery', session });
    });

    it('trusts an explicit type=recovery param over the redirect path itself', async () => {
      const mock = createMockSupabaseClient();
      const session = createMockSession();
      mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      // Deliberately at the *signup* path but declaring itself a recovery
      // credential — `type` must win, since it's what Supabase says the
      // credential is actually for (docs/ROUTES.md §3: a recovery session
      // must never be miscategorised as an ordinary signed-in one).
      const result = await processAuthDeepLink(
        mock.client,
        `murphymethod://${SIGNUP_CONFIRMATION_REDIRECT_PATH}?code=${SENTINEL_CODE}&type=recovery`,
      );

      expect(result).toEqual({ outcome: 'established', kind: 'recovery', session });
    });

    it('establishes a recovery session from access/refresh tokens (implicit-flow fallback)', async () => {
      const mock = createMockSupabaseClient();
      const session = createMockSession();
      mock.auth.setSession.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      const result = await processAuthDeepLink(
        mock.client,
        `murphymethod://${PASSWORD_RECOVERY_REDIRECT_PATH}#access_token=${SENTINEL_ACCESS_TOKEN}&refresh_token=${SENTINEL_REFRESH_TOKEN}&type=recovery`,
      );

      expect(result).toEqual({ outcome: 'established', kind: 'recovery', session });
    });

    it('never reports kind: signup for a link at the recovery path, even without a type param', async () => {
      const mock = createMockSupabaseClient();
      mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: new Error('boom'),
      });

      const result = await processAuthDeepLink(
        mock.client,
        `murphymethod://${PASSWORD_RECOVERY_REDIRECT_PATH}?code=${SENTINEL_CODE}`,
      );

      expect(result).toEqual({ outcome: 'failed', kind: 'recovery' });
    });
  });

  it('fails safely on an expired/already-used link (Supabase error params), without attempting an exchange', async () => {
    const mock = createMockSupabaseClient();

    const result = await processAuthDeepLink(
      mock.client,
      `murphymethod://${PASSWORD_RECOVERY_REDIRECT_PATH}?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`,
    );

    expect(result).toEqual({ outcome: 'failed', kind: 'recovery' });
    expect(mock.auth.setSession).not.toHaveBeenCalled();
    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('fails safely on a malformed link matching an auth path but carrying no token/code', async () => {
    const mock = createMockSupabaseClient();

    const result = await processAuthDeepLink(
      mock.client,
      `murphymethod://${SIGNUP_CONFIRMATION_REDIRECT_PATH}`,
    );

    expect(result).toEqual({ outcome: 'failed', kind: 'signup' });
    expect(mock.auth.setSession).not.toHaveBeenCalled();
    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('fails safely when Supabase rejects the code exchange (e.g. already-used code)', async () => {
    const mock = createMockSupabaseClient();
    mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: new Error('invalid or expired code'),
    });

    const result = await processAuthDeepLink(
      mock.client,
      `murphymethod://${SIGNUP_CONFIRMATION_REDIRECT_PATH}?code=${SENTINEL_CODE}`,
    );

    expect(result).toEqual({ outcome: 'failed', kind: 'signup' });
  });

  it('never logs the raw URL, token, or code, on success or failure', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const mock = createMockSupabaseClient();
      mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: new Error('invalid or expired code'),
      });

      await processAuthDeepLink(
        mock.client,
        `murphymethod://${PASSWORD_RECOVERY_REDIRECT_PATH}?code=${SENTINEL_CODE}`,
      );
      await processAuthDeepLink(
        mock.client,
        `murphymethod://${SIGNUP_CONFIRMATION_REDIRECT_PATH}#access_token=${SENTINEL_ACCESS_TOKEN}&refresh_token=${SENTINEL_REFRESH_TOKEN}`,
      );

      for (const spy of [logSpy, warnSpy, errorSpy]) {
        for (const call of spy.mock.calls) {
          const serialized = call.map((arg) => String(arg)).join(' ');
          expect(serialized).not.toContain(SENTINEL_CODE);
          expect(serialized).not.toContain(SENTINEL_ACCESS_TOKEN);
          expect(serialized).not.toContain(SENTINEL_REFRESH_TOKEN);
        }
      }
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
