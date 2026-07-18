import { useState } from 'react';

export function MeasurementGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-neutral-600 dark:text-neutral-400 underline underline-offset-2"
      >
        {open ? 'Hide' : 'How to measure accurately'}
      </button>
      {open && (
        <ul className="mt-2 space-y-2 text-neutral-600 dark:text-neutral-400 list-disc pl-5">
          <li>
            Use a flexible (cloth or vinyl) tape, not a rigid one. Measure against skin, not
            over clothing.
          </li>
          <li>
            <strong>Neck:</strong> just below the larynx (Adam's apple), tape sloping slightly
            downward to the front.
          </li>
          <li>
            <strong>Waist:</strong> at the navel, standing relaxed, tape parallel to the floor.
            Don't suck in or flex.
          </li>
          <li>
            <strong>Hip</strong> (female only): at the widest point around the buttocks.
          </li>
          <li>
            Tape should sit snug against skin but not compress it. Take each measurement twice
            and use the average.
          </li>
          <li>
            Measure at the same time of day (e.g. morning, before eating) for comparable
            results over time — the formula is accurate, but day-to-day water retention and
            technique changes are the biggest source of noise.
          </li>
        </ul>
      )}
    </div>
  );
}
