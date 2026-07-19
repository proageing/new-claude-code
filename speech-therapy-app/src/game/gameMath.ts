import type { CalibrationBaseline } from "../audio/calibration";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const MIN_SPAN_DB = 0.1; // guards against divide-by-zero on odd calibration data

/**
 * Maps current loudness directly to a target altitude (0-100), scaled by
 * the patient's own calibration: exactly at target -> 50 (mid-sky), at or
 * above their calibrated "loud" -> 100, at or below their calibrated
 * "comfortable" -> 0. This is a proportional mapping, not an accumulator —
 * the target altitude is always a direct function of current loudness, so
 * it can't drift or get stuck the way a velocity/gravity model can.
 */
export function computeTargetAltitude(smoothedDbfs: number, baseline: CalibrationBaseline): number {
  const { comfortableDbfs, targetDbfs, loudDbfs } = baseline;

  if (smoothedDbfs >= targetDbfs) {
    const span = Math.max(loudDbfs - targetDbfs, MIN_SPAN_DB);
    const frac = clamp((smoothedDbfs - targetDbfs) / span, 0, 1);
    return 50 + frac * 50;
  }

  const span = Math.max(targetDbfs - comfortableDbfs, MIN_SPAN_DB);
  const frac = clamp((targetDbfs - smoothedDbfs) / span, 0, 1);
  return 50 - frac * 50;
}
