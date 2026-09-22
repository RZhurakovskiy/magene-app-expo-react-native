export type MonitoringSessionKind = 'sleep' | 'day';

export interface MonitoringMinuteStat {
  avgBpm: number;
  minBpm: number;
  maxBpm: number;
  sampleCount: number;
  avgHrvMs: number | null;
  rrCount: number;
}

export interface SessionSummary {
  kind: MonitoringSessionKind;
  avgBpm: number | null;
  minBpm: number | null;
  maxBpm: number | null;
  restingBpm: number | null;
  minutesTracked: number;
  avgHrvMs: number | null;
  hasRr: boolean;
}

// A session counts as sleep when it is long enough and its midpoint falls in
// the night window — overnight low-HR wear, without needing a motion sensor.
export function classifyKind(startedAt: number, endedAt: number): MonitoringSessionKind {
  const durationHours = (endedAt - startedAt) / 3600000;
  const midHour = new Date((startedAt + endedAt) / 2).getHours();
  const overlapsNight = midHour >= 22 || midHour < 10;
  return durationHours >= 2 && overlapsNight ? 'sleep' : 'day';
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

export function computeSessionSummary(
  minutes: MonitoringMinuteStat[],
  startedAt: number,
  endedAt: number,
): SessionSummary {
  let weightedSum = 0;
  let totalSamples = 0;
  let min = Infinity;
  let max = -Infinity;
  let hrvSum = 0;
  let hrvCount = 0;
  let hasRr = false;
  const avgList: number[] = [];

  for (const m of minutes) {
    weightedSum += m.avgBpm * m.sampleCount;
    totalSamples += m.sampleCount;
    min = Math.min(min, m.minBpm);
    max = Math.max(max, m.maxBpm);
    avgList.push(m.avgBpm);
    if (m.avgHrvMs != null) {
      hrvSum += m.avgHrvMs;
      hrvCount += 1;
    }
    if (m.rrCount > 0) hasRr = true;
  }

  return {
    kind: classifyKind(startedAt, endedAt),
    avgBpm: totalSamples > 0 ? Math.round(weightedSum / totalSamples) : null,
    minBpm: min === Infinity ? null : min,
    maxBpm: max === -Infinity ? null : max,
    restingBpm: avgList.length > 0 ? percentile(avgList, 0.05) : null,
    minutesTracked: minutes.length,
    avgHrvMs: hrvCount > 0 ? Math.round(hrvSum / hrvCount) : null,
    hasRr,
  };
}
