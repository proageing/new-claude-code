import type { SessionRecord } from "../game/types";

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
      <p className="stat">Peak altitude: {Math.round(record.peakAltitude)}%</p>
      <p className="stat">Duration: {record.durationSeconds}s</p>
      <p className="baseline-summary">
        Comfortable: {record.comfortableDbfs.toFixed(1)} dBFS · Loud:{" "}
        {record.loudDbfs.toFixed(1)} dBFS · Target: {record.targetDbfs.toFixed(1)} dBFS
      </p>
      <button onClick={onPlayAgain}>Play Again</button>
      <button onClick={onViewHistory}>View History</button>
    </div>
  );
}
