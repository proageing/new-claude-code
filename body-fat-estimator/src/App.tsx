import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { MeasurementForm } from './components/MeasurementForm';
import { HistoryList } from './components/HistoryList';
import { TrendChart } from './components/TrendChart';
import { DataBackup } from './components/DataBackup';

function App() {
  const entries = useLiveQuery(() => db.entries.orderBy('date').toArray(), []);

  return (
    <div className="min-h-svh bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold">Body Fat Tracker</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            US Navy tape-measurement method. Your data stays on this device only.
          </p>
        </header>

        <MeasurementForm />

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Trend</h2>
          <TrendChart entries={entries ?? []} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">History</h2>
            <DataBackup />
          </div>
          <HistoryList entries={entries ?? []} />
        </section>
      </div>
    </div>
  );
}

export default App;
