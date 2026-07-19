// Core mic-capture + loudness-metering engine. No React here — this is plain
// Web Audio API so the metering loop can run independently of render cycles.

const SILENCE_FLOOR_DBFS = -60;

/** Root-mean-square of a Float32 PCM buffer, as amplitude in [0, 1]. */
function rms(buffer: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  return Math.sqrt(sumSquares / buffer.length);
}

/** Convert linear RMS amplitude to dBFS (0 dBFS = full scale, negative below). */
export function amplitudeToDbfs(amplitude: number): number {
  if (amplitude <= 0) return SILENCE_FLOOR_DBFS;
  return Math.max(SILENCE_FLOOR_DBFS, 20 * Math.log10(amplitude));
}

export interface MeterSample {
  /** Instantaneous dBFS for this analysis frame. */
  instantDbfs: number;
  /** Smoothed dBFS over the trailing window — this is what UI should render. */
  smoothedDbfs: number;
}

export type MeterListener = (sample: MeterSample) => void;

export class AudioMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private buffer: Float32Array<ArrayBuffer>;
  private smoothingWindow: number[] = [];
  private readonly smoothingWindowSize: number;

  constructor(options: { fftSize?: number; smoothingWindowSize?: number } = {}) {
    const fftSize = options.fftSize ?? 2048;
    this.smoothingWindowSize = options.smoothingWindowSize ?? 5;
    this.buffer = new Float32Array(new ArrayBuffer(fftSize * Float32Array.BYTES_PER_ELEMENT));
  }

  async start(listener: MeterListener): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // Noise suppression/echo cancellation ON: with them off, an
        // unfiltered mic picks up ambient/room/fan noise that can sit close
        // to (or above) a patient's calibrated volume range, making silence
        // read as "loud enough". autoGainControl stays off since it would
        // dynamically renormalize levels and compress the very comfortable
        // vs. loud difference the game depends on.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    });

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.buffer.length;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);

    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(this.buffer);
      const instantDbfs = amplitudeToDbfs(rms(this.buffer));

      this.smoothingWindow.push(instantDbfs);
      if (this.smoothingWindow.length > this.smoothingWindowSize) {
        this.smoothingWindow.shift();
      }
      const smoothedDbfs =
        this.smoothingWindow.reduce((a, b) => a + b, 0) / this.smoothingWindow.length;

      listener({ instantDbfs, smoothedDbfs });
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.smoothingWindow = [];
  }
}
