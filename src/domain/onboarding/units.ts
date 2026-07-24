/**
 * Canonical unit conversion (docs/DATABASE_SCHEMA.md Conventions —
 * "Canonical units and time"). Storage is always metric (kg / cm);
 * `unit_preference` only changes what a screen displays/accepts as input.
 * Every function here is pure and side-effect-free so it is trivially unit
 * testable and safe to call from render.
 */

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

/** Rounds to 1 decimal place — matches `profiles.height_cm numeric(5,1)`. */
export function roundTo1Decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Rounds to 2 decimal places — matches `body_measurements.value numeric(6,2)`. */
export function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function lbToKg(lb: number): number {
  return roundTo2Decimals(lb * KG_PER_LB);
}

export function kgToLb(kg: number): number {
  return roundTo2Decimals(kg / KG_PER_LB);
}

export function inToCm(inches: number): number {
  return roundTo1Decimal(inches * CM_PER_IN);
}

export function cmToIn(cm: number): number {
  return roundTo1Decimal(cm / CM_PER_IN);
}

/** Whole feet+inches → canonical centimetres (imperial height input is usually ft/in, not decimal inches). */
export function feetInchesToCm(feet: number, inches: number): number {
  return inToCm(feet * 12 + inches);
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_IN;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  // Carry a rounded 12in back into feet so display never shows "5 ft 12 in".
  return inches === 12 ? { feet: feet + 1, inches: 0 } : { feet, inches };
}

export function displayWeight(weightKg: number, unit: 'metric' | 'imperial'): number {
  return unit === 'imperial' ? kgToLb(weightKg) : roundTo2Decimals(weightKg);
}

export function toCanonicalWeightKg(value: number, unit: 'metric' | 'imperial'): number {
  return unit === 'imperial' ? lbToKg(value) : roundTo2Decimals(value);
}
