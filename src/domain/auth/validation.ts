/**
 * Client-side mirrors of server-side validation (docs/ARCHITECTURE.md §3.3
 * "client-side validation mirroring, not replacing, server-side
 * validation"), for immediate inline feedback. The actual constraints are
 * enforced by Supabase Auth (supabase/config.toml `auth.minimum_password_length`).
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return 'Enter your email address.';
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Enter a password.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | undefined {
  if (!confirmation) {
    return 'Confirm your password.';
  }
  if (password !== confirmation) {
    return 'Passwords do not match.';
  }
  return undefined;
}
