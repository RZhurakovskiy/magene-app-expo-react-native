import { rmssd } from '../utils/hrv';

describe('rmssd', () => {
  it('returns null with fewer than two usable intervals', () => {
    expect(rmssd([])).toBeNull();
    expect(rmssd([800])).toBeNull();
  });

  it('is zero for constant intervals', () => {
    expect(rmssd([800, 800, 800])).toBe(0);
  });

  it('computes RMSSD of successive differences', () => {
    // diff of 100 over one pair => sqrt(100^2 / 1) = 100
    expect(rmssd([800, 900])).toBe(100);
    // diffs 50 and -50 => sqrt((2500+2500)/2) = 50
    expect(rmssd([800, 850, 800])).toBe(50);
  });

  it('filters out physiologically impossible intervals', () => {
    // 5000 ms is dropped, leaving [800, 810] => diff 10
    expect(rmssd([800, 5000, 810])).toBe(10);
  });

  it('skips beat pairs that jump more than 20% (missed or extra beats)', () => {
    // 1600 ms is a missed beat: both pairs touching it are left out,
    // leaving diffs 10 and -10 => 10 instead of a ~560 ms spike.
    expect(rmssd([800, 810, 1600, 800, 790])).toBe(10);
    expect(rmssd([800, 1600])).toBeNull();
  });
});
