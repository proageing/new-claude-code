import { useMemo, useState } from 'react';
import {
  estimateBodyFatPercent,
  roundBodyFat,
  toCm,
  type Sex,
  type UnitSystem,
} from '../lib/bodyFat';
import { weightToKg } from '../lib/units';
import { db } from '../lib/db';
import { MeasurementGuide } from './MeasurementGuide';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MeasurementForm() {
  const [unit, setUnit] = useState<UnitSystem>('metric');
  const [sex, setSex] = useState<Sex>('male');
  const [date, setDate] = useState(todayIso());
  const [height, setHeight] = useState('');
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const lengthLabel = unit === 'imperial' ? 'in' : 'cm';
  const weightLabel = unit === 'imperial' ? 'lb' : 'kg';

  const preview = useMemo(() => {
    const h = parseFloat(height);
    const n = parseFloat(neck);
    const w = parseFloat(waist);
    const hi = parseFloat(hip);
    if (!h || !n || !w || (sex === 'female' && !hi)) return null;
    try {
      const bf = estimateBodyFatPercent({
        sex,
        heightCm: toCm(h, unit),
        neckCm: toCm(n, unit),
        waistCm: toCm(w, unit),
        hipCm: sex === 'female' ? toCm(hi, unit) : undefined,
      });
      return roundBodyFat(bf);
    } catch {
      return null;
    }
  }, [height, neck, waist, hip, sex, unit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const h = parseFloat(height);
    const n = parseFloat(neck);
    const w = parseFloat(waist);
    const hi = parseFloat(hip);
    const wt = weight ? parseFloat(weight) : undefined;

    if (!h || !n || !w || (sex === 'female' && !hi)) {
      setError('Please fill in all required measurements.');
      return;
    }

    try {
      const heightCm = toCm(h, unit);
      const neckCm = toCm(n, unit);
      const waistCm = toCm(w, unit);
      const hipCm = sex === 'female' ? toCm(hi, unit) : undefined;
      const bodyFatPercent = roundBodyFat(
        estimateBodyFatPercent({ sex, heightCm, neckCm, waistCm, hipCm }),
      );

      await db.entries.add({
        date,
        sex,
        heightCm,
        neckCm,
        waistCm,
        hipCm,
        weightKg: wt != null && !Number.isNaN(wt) ? weightToKg(wt, unit) : undefined,
        bodyFatPercent,
        createdAt: Date.now(),
      });

      setSaved(true);
      setNeck('');
      setWaist('');
      setHip('');
      setWeight('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save entry.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          New measurement
        </h2>
        <div className="flex rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setUnit('metric')}
            className={`px-3 py-1 ${unit === 'metric' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : ''}`}
          >
            cm / kg
          </button>
          <button
            type="button"
            onClick={() => setUnit('imperial')}
            className={`px-3 py-1 ${unit === 'imperial' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : ''}`}
          >
            in / lb
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm space-y-1">
          <span className="text-neutral-600 dark:text-neutral-400">Sex</span>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="text-sm space-y-1">
          <span className="text-neutral-600 dark:text-neutral-400">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberField label={`Height (${lengthLabel})`} value={height} onChange={setHeight} required />
        <NumberField label={`Neck (${lengthLabel})`} value={neck} onChange={setNeck} required />
        <NumberField label={`Waist (${lengthLabel})`} value={waist} onChange={setWaist} required />
        {sex === 'female' && (
          <NumberField label={`Hip (${lengthLabel})`} value={hip} onChange={setHip} required />
        )}
        <NumberField
          label={`Weight (${weightLabel}, optional)`}
          value={weight}
          onChange={setWeight}
        />
      </div>

      <MeasurementGuide />

      {preview != null && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Estimated body fat: <span className="font-semibold">{preview}%</span>
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && (
        <p className="text-sm text-green-700 dark:text-green-400">Entry saved.</p>
      )}

      <button
        type="submit"
        className="rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 px-4 py-2 text-sm font-medium"
      >
        Save entry
      </button>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm space-y-1 block">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
      />
    </label>
  );
}
