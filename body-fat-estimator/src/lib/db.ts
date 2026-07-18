import Dexie, { type EntityTable } from 'dexie';
import type { Sex } from './bodyFat';

export interface MeasurementEntry {
  id?: number;
  /** ISO date string (yyyy-mm-dd), one entry per day is the common case */
  date: string;
  sex: Sex;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number;
  weightKg?: number;
  bodyFatPercent: number;
  createdAt: number;
}

export const db = new Dexie('body-fat-estimator') as Dexie & {
  entries: EntityTable<MeasurementEntry, 'id'>;
};

db.version(1).stores({
  entries: '++id, date, createdAt',
});
