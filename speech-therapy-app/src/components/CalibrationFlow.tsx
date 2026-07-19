import { useEffect, useRef, useState } from "react";
import { useAudioMeter } from "../audio/useAudioMeter";
import { deriveBaseline, summarizeCapture, type CalibrationBaseline } from "../audio/calibration";

const CAPTURE_DURATION_MS = 3000;
const SAMPLE_INTERVAL_MS = 16; // approximate requestAnimationFrame cadence (~60fps)

type Step = "intro" | "comfortable" | "loud" | "done";

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

  useEffect(() => {
    if (step !== "comfortable" && step !== "loud") return;
    if (!isRunning || !sample) return;
    samplesRef.current.push(sample.instantDbfs);
  }, [sample, isRunning, step]);

  // Records one step (comfortable or loud) and resolves with its average
  // dBFS. Each step needs its own mic start/stop and countdown, so the two
  // steps must be awaited in sequence rather than fired independently.
  async function captureStep(next: "comfortable" | "loud"): Promise<number> {
    samplesRef.current = [];
    setStep(next);
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

  async function runFullCalibration() {
    const comfortableDbfs = await captureStep("comfortable");
    const loudDbfs = await captureStep("loud");
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
        <button onClick={() => runFullCalibration()}>Start Calibration</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (step === "comfortable" || step === "loud") {
    const label =
      step === "comfortable"
        ? 'Say "ahh" at your normal, comfortable speaking volume'
        : 'Now say "ahh" as loud as you comfortably can — like projecting across a room';
    return (
      <div className="card">
        <h2>{step === "comfortable" ? "Step 1 of 2" : "Step 2 of 2"}</h2>
        <p>{label}</p>
        <div className="countdown">{countdown}</div>
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
