import { useEffect, useRef, useState } from "react";
import { useAudioMeter } from "../audio/useAudioMeter";
import { deriveBaseline, summarizeCapture, type CalibrationBaseline } from "../audio/calibration";

const CAPTURE_DURATION_MS = 3000;
const SAMPLE_INTERVAL_MS = 16; // approximate requestAnimationFrame cadence (~60fps)
// Below this gap, comfortable and loud are too close for the game to tell
// apart -- ordinary voice/breath variation would swing across the whole
// range, which is what made the balloon feel stuck or erratic even after
// the physics were fixed. Real speech comfortable-to-projecting is
// typically well past this; catching a too-small gap here beats silently
// producing an uncontrollable game.
const MIN_GAP_DB = 8;

// Each capture has a "ready" phase (instructions + a button the patient
// clicks when they're prepared) and a "recording" phase (mic live,
// counting down). Recording no longer starts automatically the instant the
// previous step ends -- that gave no time to breathe or get ready between
// the comfortable and loud captures.
type Step =
  | "intro"
  | "comfortable-ready"
  | "comfortable-recording"
  | "loud-ready"
  | "loud-recording"
  | "tooNarrow"
  | "done";

interface Props {
  onComplete: (baseline: CalibrationBaseline) => void;
}

/**
 * Two short voice captures — comfortable and loud — averaged into a
 * per-session loudness target. Recalibrating every session (rather than
 * persisting across sessions) is deliberate: device, distance, and room
 * noise vary enough that a stale baseline is unreliable.
 */
export function CalibrationFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [countdown, setCountdown] = useState(0);
  const { sample, error, isRunning, start, stop } = useAudioMeter();
  const samplesRef = useRef<number[]>([]);
  const comfortableDbfsRef = useRef<number | null>(null);

  useEffect(() => {
    if (step !== "comfortable-recording" && step !== "loud-recording") return;
    if (!isRunning || !sample) return;
    samplesRef.current.push(sample.instantDbfs);
  }, [sample, isRunning, step]);

  // Runs one capture's mic + countdown and resolves with its average dBFS.
  async function record(recordingStep: "comfortable-recording" | "loud-recording"): Promise<number> {
    samplesRef.current = [];
    setStep(recordingStep);
    setCountdown(Math.ceil(CAPTURE_DURATION_MS / 1000));
    await start();

    const countdownTimer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    await new Promise((resolve) => setTimeout(resolve, CAPTURE_DURATION_MS));
    clearInterval(countdownTimer);
    stop();

    return summarizeCapture(samplesRef.current, SAMPLE_INTERVAL_MS);
  }

  async function startComfortableRecording() {
    const comfortableDbfs = await record("comfortable-recording");
    comfortableDbfsRef.current = comfortableDbfs;
    setStep("loud-ready");
  }

  async function startLoudRecording() {
    const comfortableDbfs = comfortableDbfsRef.current;
    if (comfortableDbfs === null) return; // shouldn't happen
    const loudDbfs = await record("loud-recording");
    if (loudDbfs - comfortableDbfs < MIN_GAP_DB) {
      setStep("tooNarrow");
      return;
    }
    const baseline = deriveBaseline(comfortableDbfs, loudDbfs);
    setStep("done");
    onComplete(baseline);
  }

  if (step === "intro") {
    return (
      <div className="card">
        <h2>Voice Calibration</h2>
        <p>
          We'll capture your comfortable speaking volume, then your loud
          "projecting across a room" volume. This takes about 10 seconds and
          is redone each session.
        </p>
        <button onClick={() => setStep("comfortable-ready")}>Start Calibration</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (step === "comfortable-ready" || step === "loud-ready") {
    const isComfortable = step === "comfortable-ready";
    return (
      <div className="card">
        <h2>{isComfortable ? "Step 1 of 2" : "Step 2 of 2"}</h2>
        <p>
          {isComfortable
            ? 'When you\'re ready, say "ahh" at your normal, comfortable speaking volume.'
            : 'When you\'re ready, say "ahh" as loud as you comfortably can — like projecting across a room.'}
        </p>
        <button onClick={() => (isComfortable ? startComfortableRecording() : startLoudRecording())}>
          Start Recording
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (step === "comfortable-recording" || step === "loud-recording") {
    const label =
      step === "comfortable-recording"
        ? 'Say "ahh" at your normal, comfortable speaking volume'
        : 'Now say "ahh" as loud as you comfortably can — like projecting across a room';
    return (
      <div className="card">
        <h2>{step === "comfortable-recording" ? "Step 1 of 2" : "Step 2 of 2"}</h2>
        <p>{label}</p>
        <div className="countdown">{countdown}</div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (step === "tooNarrow") {
    return (
      <div className="card">
        <h2>Let's try that again</h2>
        <p>
          Your comfortable and loud volumes came out too close together for
          the game to tell them apart. For the loud step, really project —
          like calling to someone across a room, not just talking a bit
          louder.
        </p>
        <button onClick={() => setStep("comfortable-ready")}>Try Again</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Calibration complete</h2>
    </div>
  );
}
