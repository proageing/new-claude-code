import type { UnitSystem } from './bodyFat';

const KG_PER_LB = 0.45359237;

export function weightToKg(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? value * KG_PER_LB : value;
}

export function weightFromKg(kg: number, unit: UnitSystem): number {
  return unit === 'imperial' ? kg / KG_PER_LB : kg;
}

export function lengthFromCm(cm: number, unit: UnitSystem): number {
  return unit === 'imperial' ? cm / 2.54 : cm;
}

export function formatWeight(kg: number, unit: UnitSystem): string {
  const value = weightFromKg(kg, unit);
  return `${value.toFixed(1)} ${unit === 'imperial' ? 'lb' : 'kg'}`;
}

/** Trailing rolling average, window in number of entries (chronological order). */
export function rollingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
  });
}
