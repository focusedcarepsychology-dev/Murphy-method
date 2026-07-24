/**
 * Basic Profile validation (docs/SCREEN_SPECIFICATIONS.md §2 "Basic
 * Profile"): plausible-range checks, not medical validation, plus the
 * MVP 18+ eligibility rule (`MASTER_SPEC.md` §3). Pure functions only —
 * screens own the async persistence, this module only decides "is this
 * input acceptable to save".
 */

const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;
const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;
const MIN_AGE_YEARS = 18;
const MAX_PLAUSIBLE_AGE_YEARS = 100;

/** Whole-years age as of `today` (defaults to now) — calendar-aware, not a naive day-count divide. */
export function calculateAge(dateOfBirth: string, today: Date = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function isValidDateOfBirth(dateOfBirth: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  return dob.getTime() <= Date.now();
}

export type DateOfBirthValidationResult =
  { valid: true } | { valid: false; reason: 'invalid_date' | 'under_18' | 'implausible_age' };

/**
 * Returns a structured result rather than a boolean so the screen can show
 * clear, supportive copy for the under-18 case specifically (never a silent
 * disabled button, per docs/IMPLEMENTATION_PLAN.md Phase 3 §6).
 */
export function validateDateOfBirth(dateOfBirth: string): DateOfBirthValidationResult {
  if (!isValidDateOfBirth(dateOfBirth)) {
    return { valid: false, reason: 'invalid_date' };
  }
  const age = calculateAge(dateOfBirth);
  if (age > MAX_PLAUSIBLE_AGE_YEARS) {
    return { valid: false, reason: 'implausible_age' };
  }
  if (age < MIN_AGE_YEARS) {
    return { valid: false, reason: 'under_18' };
  }
  return { valid: true };
}

export function isPlausibleHeightCm(heightCm: number): boolean {
  return Number.isFinite(heightCm) && heightCm >= MIN_HEIGHT_CM && heightCm <= MAX_HEIGHT_CM;
}

export function isPlausibleWeightKg(weightKg: number): boolean {
  return Number.isFinite(weightKg) && weightKg >= MIN_WEIGHT_KG && weightKg <= MAX_WEIGHT_KG;
}

export const HEIGHT_RANGE_CM = { min: MIN_HEIGHT_CM, max: MAX_HEIGHT_CM };
export const WEIGHT_RANGE_KG = { min: MIN_WEIGHT_KG, max: MAX_WEIGHT_KG };
