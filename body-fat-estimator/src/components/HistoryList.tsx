import type { MeasurementEntry } from '../lib/db';
import { db } from '../lib/db';
import { formatWeight } from '../lib/units';

export function HistoryList({ entries }: { entries: MeasurementEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No entries yet. Add your first measurement above.
      </p>
    );
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-neutral-500 dark:text-neutral-400">
          <tr>
            <th className="py-1.5 pr-4 font-normal">Date</th>
            <th className="py-1.5 pr-4 font-normal">Body fat</th>
            <th className="py-1.5 pr-4 font-normal">Weight</th>
            <th className="py-1.5 pr-4 font-normal" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr key={entry.id} className="border-t border-neutral-200 dark:border-neutral-800">
              <td className="py-1.5 pr-4">{entry.date}</td>
              <td className="py-1.5 pr-4 font-medium">{entry.bodyFatPercent}%</td>
              <td className="py-1.5 pr-4">
                {entry.weightKg != null ? formatWeight(entry.weightKg, 'metric') : '—'}
              </td>
              <td className="py-1.5 pr-4 text-right">
                <button
                  type="button"
                  onClick={() => entry.id != null && db.entries.delete(entry.id)}
                  className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
