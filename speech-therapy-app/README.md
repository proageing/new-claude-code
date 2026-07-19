# Voice Volume Calibration Prototype

A throwaway prototype to de-risk the one thing the whole speech-therapy game
depends on: **can we reliably calibrate and meter loudness from an arbitrary
patient's mic in the browser?** No game art, no backend, no AI conversation —
just calibration and a live meter.

## What it does

1. **Calibration** — captures ~3s of "comfortable" speaking volume, then ~3s
   of "loud, projecting" volume, and averages each into a dBFS baseline.
2. **Target threshold** — derives a per-session loudness target 60% of the
   way from comfortable to loud.
3. **Live meter** — a real-time bar gauge (Web Audio API `AnalyserNode`,
   smoothed RMS → dBFS) showing whether the user is currently above that
   target, plus a running "% time above target" stat — the same signal the
   real game will score against.

Calibration is redone every session on purpose: device, distance, and room
noise vary enough that a stale baseline isn't trustworthy.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL, grant mic permission, and test across a few
different devices/rooms/headsets — that's the actual point of this
prototype. Watch for:

- Whether the comfortable/loud baselines come out sensibly separated on
  quiet vs. noisy laptop mics
- Whether background noise floors distort the target threshold
- Whether the smoothing window (5 frames) feels responsive or laggy

## Code map

| File | Role |
|---|---|
| `src/audio/audioMeter.ts` | Mic capture + rolling RMS→dBFS meter (plain Web Audio API, no React) |
| `src/audio/calibration.ts` | Turns two capture averages into a session target threshold |
| `src/audio/useAudioMeter.ts` | React hook wrapping `AudioMeter` |
| `src/components/CalibrationFlow.tsx` | Two-step capture UI |
| `src/components/LiveMeter.tsx` | Post-calibration live gauge + time-above-threshold stat |

## Known limitations (expected, for a throwaway prototype)

- No absolute dB SPL — dBFS is relative to each device's own gain, which is
  why calibration is per-session rather than a fixed number.
- No persistence — refreshing the page loses the calibration and stats.
- No clarity/coherence signal yet (that's the STT-confidence piece planned
  for the conversation feature, out of scope here).
