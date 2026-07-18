# Body Fat Tracker

A local-first web app for estimating and tracking body fat percentage using the
US Navy circumference method (waist/neck/height, plus hip for women). No
backend, no accounts — all data is stored in the browser's IndexedDB and never
leaves the device unless you export it.

## Why the Navy method

No phone-only technique matches DEXA or Bod Pod accuracy. The Navy tape method
is the most practical trade-off: no special hardware, a well-validated formula
(~3-4% typical error), and — critically — an error source (measurement
technique) that the app can actually help you control via in-app guidance.
The app is built around **tracking trends over time** rather than promising a
lab-grade single reading.

## Development

```bash
npm install
npm run dev      # start dev server
npm run test     # run the formula test suite
npm run build    # type-check + production build
```

## Project structure

- `src/lib/bodyFat.ts` — the Navy formula, unit-tested against reference values
- `src/lib/db.ts` — Dexie (IndexedDB) schema for measurement entries
- `src/lib/units.ts` — metric/imperial conversions and rolling-average helper
- `src/components/` — measurement form, measurement guide, trend chart, history list, JSON backup

## Roadmap ideas

- Second method (skinfold calipers or BIA smart scale) logged alongside Navy for cross-checking
- PWA packaging for offline/installable use
- Logging reminders for measurement consistency
