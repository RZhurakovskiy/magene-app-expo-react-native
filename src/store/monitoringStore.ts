import { create } from 'zustand';
import { createMonitoringSession, finalizeMonitoringSession, insertMonitoringMinute } from '../db/database';
import { generateId } from '../utils/id';
import { rmssd } from '../utils/hrv';

export type MonitoringStatus = 'idle' | 'active' | 'paused';

function minuteStart(ts: number): number {
  return Math.floor(ts / 60000) * 60000;
}

let bufferMinuteTs = 0;
let bufferSamples: number[] = [];
let bufferRr: number[] = [];

async function flushBuffer(): Promise<void> {
  if (bufferSamples.length === 0) return;
  const samples = bufferSamples;
  const rr = bufferRr;
  const minuteTs = bufferMinuteTs;
  bufferSamples = [];
  bufferRr = [];

  const sum = samples.reduce((a, b) => a + b, 0);
  const hrv = rmssd(rr);
  useMonitoringStore.setState({ lastHrvMs: hrv });
  try {
    await insertMonitoringMinute({
      minuteTs,
      avgBpm: Math.round(sum / samples.length),
      minBpm: Math.min(...samples),
      maxBpm: Math.max(...samples),
      sampleCount: samples.length,
      avgHrvMs: hrv,
      rrCount: rr.length,
    });
  } catch {
    // never let a persistence hiccup break live monitoring
  }
}

interface MonitoringState {
  status: MonitoringStatus;
  startedAt: number | null;
  sessionId: string | null;
  currentBpm: number | null;
  lastHrvMs: number | null; // RMSSD of the last completed minute

  onSample: (bpm: number, rr: number[]) => void;
  // No valid reading right now (link lost / no skin contact): show "--".
  clearLiveBpm: () => void;
  // Persist the buffered minute once it's over, even if no newer sample comes
  // along to trigger it (strap off the body, link down, app about to be killed).
  flushIfMinuteEnded: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
}

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  status: 'idle',
  startedAt: null,
  sessionId: null,
  currentBpm: null,
  lastHrvMs: null,

  onSample: (bpm, rr) => {
    const { status } = get();
    if (status === 'idle') return;
    set({ currentBpm: bpm });
    if (status !== 'active') return;

    const m = minuteStart(Date.now());
    if (bufferSamples.length > 0 && m !== bufferMinuteTs) {
      flushBuffer();
    }
    if (bufferSamples.length === 0) bufferMinuteTs = m;
    bufferSamples.push(bpm);
    if (rr.length > 0) bufferRr.push(...rr);
  },

  clearLiveBpm: () => {
    if (get().currentBpm !== null) set({ currentBpm: null });
  },

  flushIfMinuteEnded: () => {
    if (bufferSamples.length > 0 && minuteStart(Date.now()) !== bufferMinuteTs) {
      flushBuffer();
    }
  },

  start: () => {
    bufferSamples = [];
    bufferRr = [];
    bufferMinuteTs = minuteStart(Date.now());
    const id = generateId();
    const startedAt = Date.now();
    set({ status: 'active', startedAt, sessionId: id, lastHrvMs: null });
    createMonitoringSession(id, startedAt).catch(() => {});
  },

  pause: () => {
    flushBuffer();
    set({ status: 'paused' });
  },

  resume: () => {
    bufferSamples = [];
    bufferRr = [];
    bufferMinuteTs = minuteStart(Date.now());
    set({ status: 'active', lastHrvMs: null });
  },

  stop: async () => {
    await flushBuffer();
    const { sessionId } = get();
    if (sessionId) {
      await finalizeMonitoringSession(sessionId, Date.now()).catch(() => {});
    }
    set({ status: 'idle', startedAt: null, sessionId: null, currentBpm: null, lastHrvMs: null });
  },
}));
