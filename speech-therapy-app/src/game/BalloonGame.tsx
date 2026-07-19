import { useEffect, useRef, useState } from "react";
import { useAudioMeter } from "../audio/useAudioMeter";
import type { CalibrationBaseline } from "../audio/calibration";
import type { SessionRecord } from "./types";
import { clamp } from "./gameMath";
import "./BalloonGame.css";

// How strongly loudness above/below target moves the balloon, and how hard
// gravity pulls it down. Gravity means clearing the target by a hair still
// sinks; the patient has to sustain clearly loud speech to climb, which is
// the actual LSVT-style goal (sustained loudness, not a threshold tap).
//
// v1 (0.15 / 0.25, no real mic): real speech swings well above the
// calibrated target more than the flatter "ahh" held during calibration, so
// the balloon shot to the ceiling in under a second and stayed pinned.
// v2 (0.03 / 0.08) fixed the instant-ceiling problem but, in fixing it,
// raised the "hover point" — the dB excess needed just to hold position —
// from ~1.7dB to ~2.7dB, which real-mic testing showed requires noticeably
// louder-than-intended speech just to stay level. These values keep the
// hover point close to v1 (~1.5dB above target) while keeping the overall
// speed gentle: reaching the ceiling from a steady, clearly-loud voice takes
// several seconds, not one syllable, and it drifts back down during normal
// pauses. EFFECTIVE_DB_CLAMP bounds how much any single frame — including a
// stray cough or mic pop — can influence the physics.
const EFFECTIVE_DB_CLAMP = 12;
const RISE_GAIN_PER_DB = 0.012;
const GRAVITY_PER_FRAME = 0.018;
const DEFAULT_DURATION_SECONDS = 60;
// The balloon emoji renders above its own CSS anchor point, so letting
// altitude reach a literal 100% pushes most of the glyph above the "sky"
// container, where overflow:hidden clips it to a sliver. Capping the
// *displayed* position (not the underlying altitude/score, which still use
// the true 0-100 range) leaves headroom so it stays fully visible at the
// top.
const MAX_VISIBLE_ALTITUDE_PERCENT = 85;

interface Props {
  baseline: CalibrationBaseline;
  durationSeconds?: number;
  onComplete: (record: Omit<SessionRecord, "id" | "timestamp">) => void;
}

export function BalloonGame({ baseline, durationSeconds = DEFAULT_DURATION_SECONDS, onComplete }: Props) {
  const { sample, error, isRunning, start, stop } = useAudioMeter();
  const [altitude, setAltitude] = useState(50);
  const [peakAltitude, setPeakAltitude] = useState(50);
  const [framesAbove, setFramesAbove] = useState(0);
  const [framesTotal, setFramesTotal] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [finished, setFinished] = useState(false);

  const endTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Countdown + mic lifecycle — runs once for the life of this game session.
  useEffect(() => {
    start().then(() => {
      endTimeRef.current = Date.now() + durationSeconds * 1000;
    });

    const interval = setInterval(() => {
      if (!endTimeRef.current) return;
      const remainingMs = endTimeRef.current - Date.now();
      if (remainingMs <= 0) {
        setRemainingSeconds(0);
        setFinished(true);
        clearInterval(interval);
      } else {
        setRemainingSeconds(Math.ceil(remainingMs / 1000));
      }
    }, 200);

    return () => {
      clearInterval(interval);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Physics + scoring tick — driven by each new mic sample, not a separate
  // timer, so it stays in lockstep with the meter's own cadence.
  useEffect(() => {
    if (!sample || !isRunning || finished) return;

    const rawEffectiveDb = sample.smoothedDbfs - baseline.targetDbfs;
    const effectiveDb = clamp(rawEffectiveDb, -EFFECTIVE_DB_CLAMP, EFFECTIVE_DB_CLAMP);
    const delta = effectiveDb * RISE_GAIN_PER_DB - GRAVITY_PER_FRAME;

    setAltitude((prev) => {
      const next = clamp(prev + delta, 0, 100);
      setPeakAltitude((peak) => Math.max(peak, next));
      return next;
    });
    setFramesTotal((t) => t + 1);
    if (sample.smoothedDbfs >= baseline.targetDbfs) {
      setFramesAbove((a) => a + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample, isRunning, finished, baseline.targetDbfs]);

  // Fire onComplete exactly once when the countdown ends.
  useEffect(() => {
    if (!finished || completedRef.current) return;
    completedRef.current = true;
    stop();
    const pctAboveThreshold = framesTotal > 0 ? Math.round((framesAbove / framesTotal) * 100) : 0;
    onCompleteRef.current({
      comfortableDbfs: baseline.comfortableDbfs,
      loudDbfs: baseline.loudDbfs,
      targetDbfs: baseline.targetDbfs,
      pctAboveThreshold,
      durationSeconds,
      peakAltitude,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const currentDbfs = sample?.smoothedDbfs ?? baseline.targetDbfs - 20;
  const isAboveTarget = currentDbfs >= baseline.targetDbfs;
  const displayAltitude = Math.min(altitude, MAX_VISIBLE_ALTITUDE_PERCENT);

  return (
    <div className="card">
      <h2>Keep the balloon aloft</h2>
      <p className="countdown-small">{remainingSeconds}s remaining</p>

      <div className="sky">
        <div className="target-line" />
        <div className="balloon" style={{ bottom: `${displayAltitude}%` }} role="img" aria-label="balloon">
          🎈
        </div>
        <div className="ground" />
      </div>

      <p className={isAboveTarget ? "status-good" : "status-low"}>
        {isAboveTarget ? "Loud and clear — rising!" : "Project louder to climb"}
      </p>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
