export interface SessionRecord {
  id: string;
  timestamp: number; // epoch ms
  comfortableDbfs: number;
  loudDbfs: number;
  targetDbfs: number;
  pctAboveThreshold: number;
  durationSeconds: number;
  peakAltitude: number;
}
