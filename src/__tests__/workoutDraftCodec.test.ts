import { decodeWorkoutDraft, encodeWorkoutDraft, MAX_DRAFT_AGE_MS, WorkoutDraft } from '../workout/workoutDraftCodec';

const NOW = 1_800_000_000_000;

const draft: WorkoutDraft = {
  mode: 'outdoor',
  startedAt: NOW - 90 * 60 * 1000,
  hrSamples: [
    { t: NOW - 60000, bpm: 142 },
    { t: NOW - 59000, bpm: 143 },
  ],
  route: [{ lat: 56.36, lng: 44.06, t: NOW - 60000 }],
  targetZoneRange: { min: 2, max: 3 },
};

describe('workout draft codec', () => {
  it('round-trips a running workout', () => {
    expect(decodeWorkoutDraft(encodeWorkoutDraft(draft), NOW)).toEqual(draft);
  });

  it('drops a draft older than a day', () => {
    const old = { ...draft, startedAt: NOW - MAX_DRAFT_AGE_MS - 1 };
    expect(decodeWorkoutDraft(encodeWorkoutDraft(old), NOW)).toBeNull();
  });

  it('rejects garbage instead of crashing the app start', () => {
    expect(decodeWorkoutDraft('not json', NOW)).toBeNull();
    expect(decodeWorkoutDraft('{"mode":"swim","startedAt":1}', NOW)).toBeNull();
    expect(decodeWorkoutDraft('null', NOW)).toBeNull();
  });

  it('skips malformed samples but keeps the valid ones', () => {
    const json = JSON.stringify({ ...draft, hrSamples: [{ t: NOW, bpm: 120 }, { t: 'x' }, null], targetZoneRange: 'bad' });
    const decoded = decodeWorkoutDraft(json, NOW)!;
    expect(decoded.hrSamples).toEqual([{ t: NOW, bpm: 120 }]);
    expect(decoded.targetZoneRange).toBeNull();
  });
});
