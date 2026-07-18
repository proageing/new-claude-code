import { describe, expect, it } from 'vitest';
import { estimateBodyFatPercent, roundBodyFat, toCm } from './bodyFat';

describe('estimateBodyFatPercent', () => {
  it('matches the reference Navy calculation for a male example (70/15/34 in)', () => {
    const bf = estimateBodyFatPercent({
      sex: 'male',
      heightCm: toCm(70, 'imperial'),
      neckCm: toCm(15, 'imperial'),
      waistCm: toCm(34, 'imperial'),
    });
    expect(bf).toBeCloseTo(11.05, 1);
  });

  it('matches the reference Navy calculation for a female example (65/13/30/40 in)', () => {
    const bf = estimateBodyFatPercent({
      sex: 'female',
      heightCm: toCm(65, 'imperial'),
      neckCm: toCm(13, 'imperial'),
      waistCm: toCm(30, 'imperial'),
      hipCm: toCm(40, 'imperial'),
    });
    expect(bf).toBeCloseTo(7.56, 1);
  });

  it('increases with a larger waist, all else equal', () => {
    const base = { sex: 'male' as const, heightCm: 178, neckCm: 38 };
    const smaller = estimateBodyFatPercent({ ...base, waistCm: 80 });
    const larger = estimateBodyFatPercent({ ...base, waistCm: 95 });
    expect(larger).toBeGreaterThan(smaller);
  });

  it('decreases with a larger neck, all else equal', () => {
    const base = { sex: 'male' as const, heightCm: 178, waistCm: 90 };
    const smallerNeck = estimateBodyFatPercent({ ...base, neckCm: 36 });
    const largerNeck = estimateBodyFatPercent({ ...base, neckCm: 42 });
    expect(largerNeck).toBeLessThan(smallerNeck);
  });

  it('throws for a male when waist does not exceed neck', () => {
    expect(() =>
      estimateBodyFatPercent({ sex: 'male', heightCm: 178, neckCm: 40, waistCm: 38 }),
    ).toThrow();
  });

  it('throws for a female without a hip measurement', () => {
    expect(() =>
      estimateBodyFatPercent({ sex: 'female', heightCm: 165, neckCm: 33, waistCm: 76 }),
    ).toThrow();
  });
});

describe('toCm', () => {
  it('passes metric values through unchanged', () => {
    expect(toCm(180, 'metric')).toBe(180);
  });

  it('converts inches to centimeters', () => {
    expect(toCm(10, 'imperial')).toBeCloseTo(25.4, 5);
  });
});

describe('roundBodyFat', () => {
  it('rounds to one decimal place', () => {
    expect(roundBodyFat(11.049)).toBe(11);
    expect(roundBodyFat(11.05)).toBe(11.1);
    expect(roundBodyFat(11.44)).toBe(11.4);
  });
});
