import { UserProfile, WorkoutSession } from '../types';
import { estimateMaxHr, getHrZone } from './heartRateZones';

export interface PeriodStats {
  sessionCount: number;
  totalDurationSec: number;
  totalDistanceMeters: number;
  totalCalories: number;
  avgHr: number;
  zoneSeconds: number[]; // index 0 = below zone 1, index 1..5 = zones
}

export function aggregateSessions(sessions: WorkoutSession[], profile: UserProfile | null): PeriodStats {
  const zoneSeconds = [0, 0, 0, 0, 0, 0];
  let totalDurationSec = 0;
  let totalDistanceMeters = 0;
  let totalCalories = 0;
  let hrWeightedSum = 0;

  const maxHr = profile ? estimateMaxHr(profile.age, profile.gender) : null;

  for (const session of sessions) {
    totalDurationSec += session.durationSec;
    totalDistanceMeters += session.distanceMeters ?? 0;
    totalCalories += session.caloriesKcal ?? 0;
    hrWeightedSum += session.avgHr * session.durationSec;

    if (maxHr) {
      const samples = session.hrSamples;
      for (let i = 1; i < samples.length; i++) {
        const dtSec = (samples[i].t - samples[i - 1].t) / 1000;
        if (dtSec <= 0 || dtSec > 300) continue;
        const { zone } = getHrZone(samples[i].bpm, maxHr);
        zoneSeconds[zone?.index ?? 0] += dtSec;
      }
    }
  }

  return {
    sessionCount: sessions.length,
    totalDurationSec,
    totalDistanceMeters,
    totalCalories: Math.round(totalCalories),
    avgHr: totalDurationSec > 0 ? Math.round(hrWeightedSum / totalDurationSec) : 0,
    zoneSeconds,
  };
}
