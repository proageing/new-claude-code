import type { SessionRecord } from "../game/types";

interface Props {
  sessions: SessionRecord[];
  onBack: () => void;
}

export function SessionHistory({ sessions, onBack }: Props) {
  const newestFirst = [...sessions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="card">
      <h2>Session History</h2>
      {newestFirst.length === 0 ? (
        <p>No sessions yet.</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>% Above Target</th>
              <th>Comfortable</th>
              <th>Loud</th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.timestamp).toLocaleString()}</td>
                <td>{s.pctAboveThreshold}%</td>
                <td>{s.comfortableDbfs.toFixed(1)}</td>
                <td>{s.loudDbfs.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={onBack}>Back</button>
    </div>
  );
}
