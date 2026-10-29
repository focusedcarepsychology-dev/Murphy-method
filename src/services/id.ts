/**
 * Client-generated id for offline-sync idempotency keys
 * (docs/ARCHITECTURE.md §5, `workouts.client_generated_id` etc). Only
 * needs to be unique, never guessable/secret, so a Math.random-based v4
 * UUID is sufficient here and avoids adding a crypto polyfill dependency
 * for this narrow use.
 */
export function generateClientId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
