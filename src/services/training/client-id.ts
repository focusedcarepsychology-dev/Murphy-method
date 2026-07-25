/**
 * Idempotency keys for offline-safe writes (`workouts.client_generated_id`,
 * `workout_exercises.client_generated_id`, `set_logs.client_generated_id` —
 * docs/ARCHITECTURE.md §5). Replaying the same queued mutation must
 * produce the row once, so the key is generated at the moment the user
 * acts and reused for every retry of that same action.
 */
export function createClientGeneratedId(): string {
  const cryptoObject = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }

  // Fallback for runtimes without `crypto.randomUUID`. Still a
  // well-formed v4 UUID; collision risk is irrelevant at the scale of one
  // user's own set logs, and the database's unique constraint is the
  // actual guarantee.
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let index = 0; index < 36; index += 1) {
    if (index === 8 || index === 13 || index === 18 || index === 23) {
      uuid += '-';
    } else if (index === 14) {
      uuid += '4';
    } else if (index === 19) {
      uuid += hex[(Math.floor(Math.random() * 16) & 0x3) | 0x8];
    } else {
      uuid += hex[Math.floor(Math.random() * 16)];
    }
  }
  return uuid;
}
