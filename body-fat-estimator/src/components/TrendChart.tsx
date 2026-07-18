import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MeasurementEntry } from '../lib/db';
import { rollingAverage } from '../lib/units';

export function TrendChart({ entries }: { entries: MeasurementEntry[] }) {
  if (entries.length < 2) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Log at least two entries to see a trend chart.
      </p>
    );
  }

  const bfValues = entries.map((e) => e.bodyFatPercent);
  const avg = rollingAverage(bfValues, 3);
  const data = entries.map((e, i) => ({
    date: e.date,
    bodyFat: e.bodyFatPercent,
    avg: Math.round(avg[i] * 10) / 10,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" domain={['auto', 'auto']} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="bodyFat"
            name="Body fat %"
            stroke="#9333ea"
            strokeWidth={1}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="avg"
            name="3-entry average"
            stroke="#059669"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
