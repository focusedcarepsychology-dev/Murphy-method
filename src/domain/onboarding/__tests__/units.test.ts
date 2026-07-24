import {
  cmToFeetInches,
  cmToIn,
  displayWeight,
  feetInchesToCm,
  inToCm,
  kgToLb,
  lbToKg,
  roundTo1Decimal,
  roundTo2Decimals,
  toCanonicalWeightKg,
} from '@/domain/onboarding/units';

describe('unit conversion (docs/DATABASE_SCHEMA.md Conventions — canonical metric storage)', () => {
  it('converts kg <-> lb and round-trips within rounding tolerance', () => {
    expect(kgToLb(100)).toBeCloseTo(220.46, 1);
    expect(lbToKg(220.46)).toBeCloseTo(100, 1);
  });

  it('converts cm <-> inches', () => {
    expect(cmToIn(180)).toBeCloseTo(70.9, 1);
    expect(inToCm(70)).toBeCloseTo(177.8, 1);
  });

  it('converts feet+inches to cm and back without drifting outside a rounding tolerance', () => {
    const cm = feetInchesToCm(5, 10);
    expect(cm).toBeCloseTo(177.8, 1);
    const { feet, inches } = cmToFeetInches(cm);
    expect(feet).toBe(5);
    expect(inches).toBeGreaterThanOrEqual(9);
    expect(inches).toBeLessThanOrEqual(10);
  });

  it('carries a rounded 12 inches into an extra foot rather than showing "X ft 12 in"', () => {
    // 71.9 inches rounds to 72 in = exactly 6 ft 0 in, not 5 ft 12 in.
    const { feet, inches } = cmToFeetInches(inToCm(71.9));
    expect(inches).not.toBe(12);
    expect(feet).toBe(6);
    expect(inches).toBe(0);
  });

  it('rounds to the precision the schema columns expect', () => {
    expect(roundTo1Decimal(180.449)).toBe(180.4);
    expect(roundTo1Decimal(180.451)).toBe(180.5);
    expect(roundTo2Decimals(72.4449)).toBe(72.44);
    expect(roundTo2Decimals(72.446)).toBe(72.45);
  });

  it('displayWeight/toCanonicalWeightKg round-trip for both unit preferences', () => {
    expect(displayWeight(80, 'metric')).toBe(80);
    expect(toCanonicalWeightKg(80, 'metric')).toBe(80);

    const displayed = displayWeight(80, 'imperial');
    expect(displayed).toBeCloseTo(176.37, 1);
    expect(toCanonicalWeightKg(displayed, 'imperial')).toBeCloseTo(80, 1);
  });
});
