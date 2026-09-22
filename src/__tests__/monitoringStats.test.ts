import {
  classifyKind,
  computeSessionSummary,
  MonitoringMinuteStat,
  percentile,
} from '../utils/monitoringStats';

function at(y: number, mo: number, d: number, h: number, mi = 0): number {
  return new Date(y, mo, d, h, mi, 0, 0).getTime();
}

describe('classifyKind', () => {
  it('labels a long overnight session as sleep', () => {
    expect(classifyKind(at(2026, 0, 1, 23, 0), at(2026, 0, 2, 7, 0))).toBe('sleep');
  });

  it('labels a short overnight session as day (too short)', () => {
    expect(classifyKind(at(2026, 0, 1, 23, 30), at(2026, 0, 2, 0, 30))).toBe('day');
  });

  it('labels a long daytime session as day (not night)', () => {
    expect(classifyKind(at(2026, 0, 1, 12, 0), at(2026, 0, 1, 15, 0))).toBe('day');
  });
});

describe('percentile', () => {
  it('returns 0 for an empty list', () => {
    expect(percentile([], 0.5)).toBe(0);
  });

  it('picks a low value for the 5th percentile', () => {
    expect(percentile([80, 60, 70, 50, 90], 0.05)).toBe(50);
  });

  it('picks the median for the 50th percentile', () => {
    expect(percentile([10, 20, 30, 40, 50], 0.5)).toBe(30);
  });
});

describe('computeSessionSummary', () => {
  const minutes: MonitoringMinuteStat[] = [
    { avgBpm: 60, minBpm: 55, maxBpm: 65, sampleCount: 10, avgHrvMs: 40, rrCount: 5 },
    { avgBpm: 80, minBpm: 70, maxBpm: 90, sampleCount: 10, avgHrvMs: null, rrCount: 0 },
  ];

  it('aggregates BPM, resting HR, HRV and RR presence', () => {
    const summary = computeSessionSummary(minutes, at(2026, 0, 1, 23, 0), at(2026, 0, 2, 7, 0));
    expect(summary.avgBpm).toBe(70); // (60*10 + 80*10) / 20
    expect(summary.minBpm).toBe(55);
    expect(summary.maxBpm).toBe(90);
    expect(summary.restingBpm).toBe(60); // 5th percentile of [60, 80]
    expect(summary.avgHrvMs).toBe(40); // mean of the single non-null HRV
    expect(summary.hasRr).toBe(true);
    expect(summary.minutesTracked).toBe(2);
    expect(summary.kind).toBe('sleep');
  });

  it('returns nulls for an empty session', () => {
    const summary = computeSessionSummary([], at(2026, 0, 1, 12, 0), at(2026, 0, 1, 12, 30));
    expect(summary.avgBpm).toBeNull();
    expect(summary.minBpm).toBeNull();
    expect(summary.restingBpm).toBeNull();
    expect(summary.avgHrvMs).toBeNull();
    expect(summary.hasRr).toBe(false);
    expect(summary.minutesTracked).toBe(0);
  });
});
