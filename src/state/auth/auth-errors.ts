/**
 * Maps Supabase Auth errors to safe, user-facing copy. Never surfaces raw
 * provider error text, stack traces, or SQL to the user
 * (docs/IMPLEMENTATION_PLAN.md Phase 2 §17 Failure States) — the original
 * error is still logged for development diagnostics.
 */
export function mapAuthErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const normalized = rawMessage.toLowerCase();

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error('[auth] error:', error);
  }

  if (normalized.includes('invalid login credentials')) {
    // Deliberately the same message regardless of whether the email exists
    // (docs/SCREEN_SPECIFICATIONS.md §1 Sign In: never reveal account existence).
    return 'Incorrect email or password.';
  }
  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account with this email already exists.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (
    normalized.includes('password') &&
    (normalized.includes('at least') || normalized.includes('should be'))
  ) {
    // Supabase's own password-policy messages are already safe, specific,
    // and user-facing (e.g. "Password should be at least 8 characters").
    return rawMessage;
  }
  if (normalized.includes('valid email')) {
    return 'Enter a valid email address.';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('failed to fetch')
  ) {
    return 'Network error. Check your connection and try again.';
  }

  return 'Something went wrong. Please try again.';
}
