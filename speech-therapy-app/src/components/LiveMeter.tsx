import { useEffect, useRef, useState } from "react";
import { useAudioMeter } from "../audio/useAudioMeter";
import type { CalibrationBaseline } from "../audio/calibration";

const METER_FLOOR_DBFS = -60;
const METER_CEILING_DBFS = 0;

interface Props {
  baseline: CalibrationBaseline;
  onRecalibrate: () => void;
}

function clampToPercent(dbfs: number): number {
  const pct = ((dbfs - METER_FLOOR_DBFS) / (METER_CEILING_DBFS - METER_FLOOR_DBFS)) * 100;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Post-calibration test screen: live loudness bar against the session's
 * target threshold, plus a running "time above threshold" stat — the same
 * scoring signal the game will use later.
 */
export function LiveMeter({ baseline, onRecalibrate }: Props) {
  const { sample, error, isRunning, start, stop } = useAudioMeter();
  const [framesAbove, setFramesAbove] = useState(0);
  const [framesTotal, setFramesTotal] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sample || !isRunning) return;
    setFramesTotal((t) => t + 1);
    if (sample.smoothedDbfs >= baseline.targetDbfs) {
      setFramesAbove((a) => a + 1);
    }
  }, [sample, isRunning, baseline.targetDbfs]);

  const pctAboveThreshold = framesTotal > 0 ? Math.round((framesAbove / framesTotal) * 100) : 0;
  const currentDbfs = sample?.smoothedDbfs ?? METER_FLOOR_DBFS;
  const isAboveTarget = currentDbfs >= baseline.targetDbfs;

  return (
    <div className="card">
      <h2>Live Meter</h2>
      <p className="baseline-summary">
        Comfortable: {baseline.comfortableDbfs.toFixed(1)} dBFS · Loud:{" "}
        {baseline.loudDbfs.toFixed(1)} dBFS · Target: {baseline.targetDbfs.toFixed(1)} dBFS
      </p>

      <div className="meter-track">
        <div
          className="meter-target-line"
          style={{ bottom: `${clampToPercent(baseline.targetDbfs)}%` }}
        />
        <div
          className={`meter-fill ${isAboveTarget ? "above-target" : "below-target"}`}
          style={{ height: `${clampToPercent(currentDbfs)}%` }}
        />
      </div>

      <p className={isAboveTarget ? "status-good" : "status-low"}>
        {isAboveTarget ? "Loud and clear — keep going!" : "Try projecting a bit more"}
      </p>

      <p className="stat">Time above target this session: {pctAboveThreshold}%</p>

      {error && <p className="error">{error}</p>}

      <button onClick={onRecalibrate}>Recalibrate</button>
    </div>
  );
}
