import { useEffect, useRef, useState } from "react";
import { useAudioMeter } from "../audio/useAudioMeter";
import { toVolumeScore, type CalibrationBaseline } from "../audio/calibration";
import type { SessionRecord } from "./types";
import { clamp, computeTargetPosition } from "./gameMath";
import "./SailboatGame.css";

// Same validated core as BalloonGame (proportional position mapping + easing
// toward it, see gameMath.ts) -- the variety here is in the skin and the
// axis of motion (horizontal progress toward a finish line, not vertical
// climb), not in re-solving physics that already works.
const EASE_FACTOR = 0.08;
const DEFAULT_DURATION_SECONDS = 10;
// The boat emoji renders centered on its anchor and extends past it, so
// letting progress reach a literal 100% would push it half off the right
// edge of the lane, where overflow:hidden clips it. Cap the *displayed*
// position (not the underlying progress/score) for headroom.
const MAX_VISIBLE_PROGRESS_PERCENT = 92;

interface Props {
  baseline: CalibrationBaseline;
  durationSeconds?: number;
  onComplete: (record: Omit<SessionRecord, "id" | "timestamp">) => void;
}

export function SailboatGame({ baseline, durationSeconds = DEFAULT_DURATION_SECONDS, onComplete }: Props) {
  const { sample, error, isRunning, start, stop } = useAudioMeter();
  const [progress, setProgress] = useState(50);
  const [peakProgress, setPeakProgress] = useState(50);
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

    const targetProgress = computeTargetPosition(sample.smoothedDbfs, baseline);

    setProgress((prev) => {
      const next = clamp(prev + (targetProgress - prev) * EASE_FACTOR, 0, 100);
      setPeakProgress((peak) => Math.max(peak, next));
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
      peakProgress,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const currentDbfs = sample?.smoothedDbfs ?? baseline.targetDbfs - 20;
  const isAboveTarget = currentDbfs >= baseline.targetDbfs;
  const displayProgress = Math.min(progress, MAX_VISIBLE_PROGRESS_PERCENT);

  return (
    <div className="card">
      <h2>Sail to the finish</h2>
      <p className="countdown-small">{remainingSeconds}s remaining</p>

      <p className={isAboveTarget ? "status-good" : "status-low"}>
        {isAboveTarget ? "▶ Catching the wind — sail on!" : "◀ Speak up to catch the wind"}
      </p>

      <div className="water">
        <div className="wind-line" />
        <div className="finish-flag" role="img" aria-label="finish flag">
          🏁
        </div>
        <div className="boat" style={{ left: `${displayProgress}%` }} role="img" aria-label="sailboat">
          ⛵
        </div>
      </div>

      {/* Temporary while we're still tuning the physics against real voices —
          remove once the feel is validated. */}
      <p className="debug-line">
        volume: {toVolumeScore(currentDbfs)} · target: {toVolumeScore(baseline.targetDbfs)} · progress:{" "}
        {Math.round(progress)}%
      </p>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
