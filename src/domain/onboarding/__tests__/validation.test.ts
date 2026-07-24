import {
  calculateAge,
  isPlausibleHeightCm,
  isPlausibleWeightKg,
  validateDateOfBirth,
} from '@/domain/onboarding/validation';

const FIXED_NOW = new Date('2026-07-24T12:00:00.000Z');

describe('Basic Profile validation (docs/SCREEN_SPECIFICATIONS.md §2, MASTER_SPEC.md §3)', () => {
  describe('calculateAge', () => {
    it('is calendar-aware, not a naive day-count divide', () => {
      // Birthday is tomorrow relative to FIXED_NOW: still one year younger today.
      expect(calculateAge('2008-07-25', FIXED_NOW)).toBe(17);
      // Birthday was yesterday: already had this year's birthday.
      expect(calculateAge('2008-07-23', FIXED_NOW)).toBe(18);
      // Birthday is exactly today.
      expect(calculateAge('2008-07-24', FIXED_NOW)).toBe(18);
    });
  });

  describe('validateDateOfBirth', () => {
    it('blocks under-18 with a specific reason (never a silent block)', () => {
      const seventeenYearsAgo = new Date(FIXED_NOW);
      seventeenYearsAgo.setUTCFullYear(seventeenYearsAgo.getUTCFullYear() - 17);
      const iso = seventeenYearsAgo.toISOString().slice(0, 10);

      const result = validateDateOfBirth(iso);
      expect(result).toEqual({ valid: false, reason: 'under_18' });
    });

    it('accepts exactly 18 years old', () => {
      const eighteenYearsAgo = new Date(FIXED_NOW);
      eighteenYearsAgo.setUTCFullYear(eighteenYearsAgo.getUTCFullYear() - 18);
      const iso = eighteenYearsAgo.toISOString().slice(0, 10);

      // validateDateOfBirth uses the real current date internally, so pin
      // via calculateAge instead of re-deriving "today" twice.
      expect(calculateAge(iso)).toBeGreaterThanOrEqual(18);
      const result = validateDateOfBirth(iso);
      expect(result.valid).toBe(true);
    });

    it('rejects an implausibly old date of birth', () => {
      expect(validateDateOfBirth('1850-01-01')).toEqual({
        valid: false,
        reason: 'implausible_age',
      });
    });

    it('rejects a malformed date string', () => {
      expect(validateDateOfBirth('not-a-date')).toEqual({ valid: false, reason: 'invalid_date' });
      expect(validateDateOfBirth('2020-13-40')).toEqual({ valid: false, reason: 'invalid_date' });
    });

    it('rejects a future date of birth', () => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      expect(validateDateOfBirth(nextYear.toISOString().slice(0, 10))).toEqual({
        valid: false,
        reason: 'invalid_date',
      });
    });
  });

  describe('plausibility ranges (defensive, not medical thresholds)', () => {
    it('accepts realistic heights and rejects implausible ones', () => {
      expect(isPlausibleHeightCm(170)).toBe(true);
      expect(isPlausibleHeightCm(99)).toBe(false);
      expect(isPlausibleHeightCm(251)).toBe(false);
      expect(isPlausibleHeightCm(Number.NaN)).toBe(false);
    });

    it('accepts realistic weights and rejects implausible ones', () => {
      expect(isPlausibleWeightKg(75)).toBe(true);
      expect(isPlausibleWeightKg(29)).toBe(false);
      expect(isPlausibleWeightKg(301)).toBe(false);
    });
  });
});
