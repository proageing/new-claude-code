import { useCallback, useEffect, useRef, useState } from "react";
import { AudioMeter, type MeterSample } from "./audioMeter";

export interface UseAudioMeterResult {
  sample: MeterSample | null;
  error: string | null;
  isRunning: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

/** React wrapper around AudioMeter — owns the mic lifecycle for one component tree. */
export function useAudioMeter(): UseAudioMeterResult {
  const [sample, setSample] = useState<MeterSample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const meterRef = useRef<AudioMeter | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const meter = new AudioMeter();
      meterRef.current = meter;
      await meter.start((s) => setSample(s));
      setIsRunning(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Microphone access failed: ${err.message}`
          : "Microphone access failed.",
      );
      setIsRunning(false);
    }
  }, []);

  const stop = useCallback(() => {
    meterRef.current?.stop();
    meterRef.current = null;
    setIsRunning(false);
  }, []);

  useEffect(() => stop, [stop]);

  return { sample, error, isRunning, start, stop };
}
