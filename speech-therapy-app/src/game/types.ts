export interface SessionRecord {
  id: string;
  timestamp: number; // epoch ms
  comfortableDbfs: number;
  loudDbfs: number;
  targetDbfs: number;
  pctAboveThreshold: number;
  durationSeconds: number;
  // Best 0-100 position reached during the round -- balloon altitude,
  // sailboat progress, or any future game skin's equivalent.
  peakProgress: number;
}
