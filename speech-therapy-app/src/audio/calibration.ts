// Turns a short capture of "comfortable" and "loud" voice into a per-session
// loudness target. Calibration is redone every session on purpose — device,
// distance, and room noise vary enough that a stale baseline is unreliable.

const ONSET_DISCARD_MS = 300;
const TARGET_FRACTION = 0.6; // how far from comfortable -> loud the target sits

export interface CalibrationBaseline {
  comfortableDbfs: number;
  loudDbfs: number;
  targetDbfs: number;
}

/**
 * @param samples dBFS readings captured during a fixed-duration recording, in order.
 * @param sampleIntervalMs approximate time between samples (for onset trimming).
 */
export function summarizeCapture(samples: number[], sampleIntervalMs: number): number {
  const discardCount = Math.ceil(ONSET_DISCARD_MS / sampleIntervalMs);
  const stable = samples.slice(discardCount);
  const usable = stable.length > 0 ? stable : samples;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

export function deriveBaseline(comfortableDbfs: number, loudDbfs: number): CalibrationBaseline {
  const targetDbfs = comfortableDbfs + TARGET_FRACTION * (loudDbfs - comfortableDbfs);
  return { comfortableDbfs, loudDbfs, targetDbfs };
}

// dBFS is a negative, audio-engineering unit -- correct for the scoring
// math, but it reads as broken to a patient ("why is my volume negative?").
// This converts it to a positive 0-100 score for anything shown to users.
// The scale is fixed (not session-relative), so scores stay comparable
// across different sessions/days -- which matters for the history table,
// where the actual clinically meaningful signal is whether a patient's
// comfortable/loud volume trends up over weeks.
const DISPLAY_FLOOR_DBFS = -60;
const DISPLAY_CEILING_DBFS = 0;

export function toVolumeScore(dbfs: number): number {
  const pct = ((dbfs - DISPLAY_FLOOR_DBFS) / (DISPLAY_CEILING_DBFS - DISPLAY_FLOOR_DBFS)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
