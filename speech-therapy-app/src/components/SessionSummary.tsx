import type { SessionRecord } from "../game/types";
import { toVolumeScore } from "../audio/calibration";

interface Props {
  record: SessionRecord;
  onPlayAgain: () => void;
  onViewHistory: () => void;
}

export function SessionSummary({ record, onPlayAgain, onViewHistory }: Props) {
  return (
    <div className="card">
      <h2>Session complete</h2>
      <p className="stat">Time above target: {record.pctAboveThreshold}%</p>
      <p className="stat">Best moment: {Math.round(record.peakProgress)}%</p>
      <p className="stat">Duration: {record.durationSeconds}s</p>
      <p className="baseline-summary">
        Comfortable: {toVolumeScore(record.comfortableDbfs)} · Loud: {toVolumeScore(record.loudDbfs)} ·
        Target: {toVolumeScore(record.targetDbfs)}
      </p>
      <button onClick={onPlayAgain}>Play Again</button>
      <button onClick={onViewHistory}>View History</button>
    </div>
  );
}
