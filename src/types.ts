export type WorkoutMode = 'treadmill' | 'outdoor';
export type Gender = 'male' | 'female';

export interface UserProfile {
  weightKg: number;
  age: number;
  gender: Gender;
}

export interface HrSample {
  t: number;
  bpm: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  t: number;
}

export interface WorkoutSession {
  id: string;
  mode: WorkoutMode;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  avgHr: number;
  maxHr: number;
  minHr: number;
  hrSamples: HrSample[];
  distanceMeters?: number;
  avgPaceSecPerKm?: number;
  route?: RoutePoint[];
  caloriesKcal?: number;
}

export interface WorkoutSessionSummary {
  id: string;
  mode: WorkoutMode;
  startedAt: number;
  durationSec: number;
  avgHr: number;
  distanceMeters?: number;
  avgPaceSecPerKm?: number;
  caloriesKcal?: number;
}
