/**
 * Greeting composition (INVARIANT D: a null `profiles.display_name` can
 * never turn into a name the user did not enter).
 *
 * The rule is deliberately boring: if the profile has a usable name, use
 * it; otherwise greet without one. There is no fallback name, no name
 * derived from the email address, and no comma left dangling after an
 * empty string.
 */
export function greetingWithName(greeting: string, displayName: string | null | undefined): string {
  const name = (displayName ?? '').trim();
  return name.length > 0 ? `${greeting}, ${name}` : greeting;
}

/** Longest name we render inline before it starts crowding a phone header. */
export const DISPLAY_NAME_MAX_LENGTH = 40;

export type DisplayNameValidation =
  { valid: true; value: string | null } | { valid: false; error: string };

/**
 * Validates the optional "What should we call you?" field. Empty is a
 * fully valid answer that clears the name — a name is never required, and
 * nothing downstream (programme generation included) depends on it.
 */
export function validateDisplayName(input: string): DisplayNameValidation {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { valid: true, value: null };
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return { valid: false, error: `Please use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.` };
  }
  return { valid: true, value: trimmed };
}
