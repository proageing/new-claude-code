import { useEffect, useRef, useState } from "react";
import { useAudioMeter } from "../audio/useAudioMeter";
import type { CalibrationBaseline } from "../audio/calibration";
import type { SessionRecord } from "./types";
import { clamp } from "./gameMath";
import "./BalloonGame.css";

// How strongly loudness above/below target moves the balloon, and how hard
// gravity pulls it down. Tuned by feel, not measurement — expect to revisit
// once real patients try it. Gravity means clearing the target by a hair
// still sinks; the patient has to sustain clearly loud speech to climb,
// which is the actual LSVT-style goal (sustained loudness, not a threshold
// tap).
const RISE_GAIN_PER_DB = 0.15;
const GRAVITY_PER_FRAME = 0.25;
const DEFAULT_DURATION_SECONDS = 60;

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

    const effectiveDb = sample.smoothedDbfs - baseline.targetDbfs;
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

  return (
    <div className="card">
      <h2>Keep the balloon aloft</h2>
      <p className="countdown-small">{remainingSeconds}s remaining</p>

      <div className="sky">
        <div className="target-line" />
        <div className="balloon" style={{ bottom: `${altitude}%` }} role="img" aria-label="balloon">
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
