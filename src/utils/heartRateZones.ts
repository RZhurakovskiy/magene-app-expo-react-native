import { Gender } from '../types';

export function estimateMaxHr(age: number, gender: Gender): number {
  return Math.round(gender === 'female' ? 206 - 0.88 * age : 220 - age);
}

export interface HrZone {
  index: number;
  label: string;
  minPercent: number;
  maxPercent: number;
  color: string;
}

export const NO_ZONE_COLOR = '#6B6B76';

export const ZONES: HrZone[] = [
  { index: 1, label: 'Разминка', minPercent: 50, maxPercent: 60, color: '#5AC8FA' },
  { index: 2, label: 'Жиросжигание', minPercent: 60, maxPercent: 70, color: '#3DDC97' },
  { index: 3, label: 'Выносливость', minPercent: 70, maxPercent: 80, color: '#FFD166' },
  { index: 4, label: 'Силовая выносливость', minPercent: 80, maxPercent: 90, color: '#FF8A3D' },
  { index: 5, label: 'Максимальная', minPercent: 90, maxPercent: Infinity, color: '#FF3B5C' },
];

export interface HrZoneResult {
  zone: HrZone | null;
  percent: number;
}

export function getHrZone(bpm: number, maxHr: number): HrZoneResult {
  const percent = (bpm / maxHr) * 100;
  if (percent < ZONES[0].minPercent) return { zone: null, percent };
  const zone = ZONES.find((z) => percent < z.maxPercent) ?? ZONES[ZONES.length - 1];
  return { zone, percent };
}
