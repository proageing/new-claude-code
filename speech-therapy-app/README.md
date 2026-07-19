# Loud & Clear — Voice Volume Game

Phase 1 MVP of the speech-therapy game: calibrate to the patient's own
voice, then keep a balloon aloft by sustaining loud, clear speech. Builds on
the calibration/metering prototype validated earlier — no backend, no
conversation/AI feature yet (that's Phase 2).

## What it does

1. **Calibration** — captures ~3s of "comfortable" speaking volume, then ~3s
   of "loud, projecting" volume, and averages each into a dBFS baseline.
   Redone every session on purpose: device, distance, and room noise vary
   enough that a stale baseline isn't trustworthy.
2. **Target threshold** — derives a per-session loudness target 60% of the
   way from comfortable to loud.
3. **Balloon game** — a 60-second round where the balloon rises when the
   patient speaks clearly above target and sinks (gravity) otherwise.
   Clearing the target by a hair still sinks slowly — sustained loud speech
   is required to climb, which matches the actual therapy goal (sustained
   loudness, not a one-off threshold tap).
4. **Session summary** — % time above target, peak altitude, and the
   session's dBFS baselines.
5. **Session history** — past sessions stored in `localStorage` (single
   device only — swap for a backend once accounts/clinician view land).

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL, grant mic permission, and play a round.
Things worth testing across devices:

- Whether the comfortable/loud baselines come out sensibly separated on
  quiet vs. noisy laptop mics
- Whether the balloon's rise/gravity balance (`RISE_GAIN_PER_DB` /
  `GRAVITY_PER_FRAME` in `BalloonGame.tsx`) feels achievable vs. frustrating
- Whether the smoothing window (5 frames) feels responsive or laggy

## Code map

| File | Role |
|---|---|
| `src/audio/audioMeter.ts` | Mic capture + rolling RMS→dBFS meter (plain Web Audio API, no React) |
| `src/audio/calibration.ts` | Turns two capture averages into a session target threshold |
| `src/audio/useAudioMeter.ts` | React hook wrapping `AudioMeter` |
| `src/components/CalibrationFlow.tsx` | Two-step capture UI |
| `src/game/BalloonGame.tsx` | The game loop — meter-driven balloon physics + scoring |
| `src/game/sessionHistory.ts` | `localStorage`-backed session store |
| `src/game/types.ts` | `SessionRecord` shape |
| `src/components/SessionSummary.tsx` | Post-game results screen |
| `src/components/SessionHistory.tsx` | Past-sessions table |

## Known limitations (expected at this stage)

- No absolute dB SPL — dBFS is relative to each device's own gain, which is
  why calibration is per-session rather than a fixed number.
- Session history is per-browser (`localStorage`), not per-account.
- No clarity/coherence signal yet (that's the STT-confidence piece planned
  for the conversation feature).
- Balloon physics constants are tuned by feel, not user testing — expect to
  revisit once real patients try it.
