import { useEffect, useRef, useState } from "react";
import { useAudioMeter } from "../audio/useAudioMeter";
import type { CalibrationBaseline } from "../audio/calibration";
import type { SessionRecord } from "./types";
import { clamp, computeTargetAltitude } from "./gameMath";
import "./BalloonGame.css";

// Two earlier versions of this game used an accumulator model: loudness
// added "velocity", a fixed gravity constant subtracted from it each frame.
// That's fragile for a "keep it level" mechanic — any small persistent bias
// compounds over time instead of settling, which is why real-mic testing
// kept showing the same symptom (balloon climbs and never comes back down)
// no matter how the gain/gravity constants were tuned. This version instead
// recomputes a *target* altitude directly from current loudness every frame
// (see computeTargetAltitude in gameMath.ts) and eases the displayed
// altitude toward it. Since the target is always a direct function of
// current input rather than accumulated history, it can't drift or get
// stuck — it settles wherever the patient's current loudness maps to.
const EASE_FACTOR = 0.08; // fraction of the gap to target altitude closed per frame
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

    const targetAltitude = computeTargetAltitude(sample.smoothedDbfs, baseline);

    setAltitude((prev) => {
      const next = clamp(prev + (targetAltitude - prev) * EASE_FACTOR, 0, 100);
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

      {/* Temporary while we're still tuning the physics against real voices —
          remove once the feel is validated. */}
      <p className="debug-line">
        now: {currentDbfs.toFixed(1)} dBFS · target: {baseline.targetDbfs.toFixed(1)} · altitude:{" "}
        {Math.round(altitude)}%
      </p>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
