export type Sex = 'male' | 'female';
export type UnitSystem = 'metric' | 'imperial';

export interface NavyMeasurements {
  sex: Sex;
  /** cm if metric, inches if imperial */
  heightCm: number;
  neckCm: number;
  waistCm: number;
  /** required for female, ignored for male */
  hipCm?: number;
}

const CM_PER_INCH = 2.54;

export function toCm(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? value * CM_PER_INCH : value;
}

/**
 * US Navy circumference method. Inputs are centimeters; the classic formula
 * is defined in inches, so we convert internally rather than exposing the
 * inch-based constants at call sites.
 */
export function estimateBodyFatPercent(m: NavyMeasurements): number {
  const height = m.heightCm / CM_PER_INCH;
  const neck = m.neckCm / CM_PER_INCH;
  const waist = m.waistCm / CM_PER_INCH;

  if (m.sex === 'male') {
    const circumferenceDiff = waist - neck;
    if (circumferenceDiff <= 0) {
      throw new Error('Waist measurement must be greater than neck measurement');
    }
    const bf =
      495 /
        (1.0324 - 0.19077 * Math.log10(circumferenceDiff) + 0.15456 * Math.log10(height)) -
      450;
    return bf;
  }

  if (m.hipCm == null) {
    throw new Error('Hip measurement is required for the female formula');
  }
  const hip = m.hipCm / CM_PER_INCH;
  const circumferenceDiff = waist + hip - neck;
  if (circumferenceDiff <= 0) {
    throw new Error('Waist + hip must be greater than neck measurement');
  }
  const bf =
    495 /
      (1.29579 - 0.35004 * Math.log10(circumferenceDiff) + 0.221 * Math.log10(height)) -
    450;
  return bf;
}

export function roundBodyFat(value: number): number {
  return Math.round(value * 10) / 10;
}
