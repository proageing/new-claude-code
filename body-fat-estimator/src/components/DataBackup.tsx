import { useRef } from 'react';
import { db, type MeasurementEntry } from '../lib/db';

export function DataBackup() {
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleExport() {
    const entries = await db.entries.toArray();
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `body-fat-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as MeasurementEntry[];
    if (!Array.isArray(parsed)) throw new Error('Invalid backup file');
    await db.entries.bulkAdd(parsed.map(({ id: _id, ...rest }) => rest));
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        type="button"
        onClick={handleExport}
        className="text-neutral-600 dark:text-neutral-400 underline underline-offset-2"
      >
        Export backup (JSON)
      </button>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="text-neutral-600 dark:text-neutral-400 underline underline-offset-2"
      >
        Import backup
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file).catch((err) => alert(err.message));
          e.target.value = '';
        }}
      />
    </div>
  );
}
