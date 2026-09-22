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
  try {
    await insertMonitoringMinute({
      minuteTs,
      avgBpm: Math.round(sum / samples.length),
      minBpm: Math.min(...samples),
      maxBpm: Math.max(...samples),
      sampleCount: samples.length,
      avgHrvMs: rmssd(rr),
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

  onSample: (bpm: number, rr: number[]) => void;
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

  start: () => {
    bufferSamples = [];
    bufferRr = [];
    bufferMinuteTs = minuteStart(Date.now());
    const id = generateId();
    const startedAt = Date.now();
    set({ status: 'active', startedAt, sessionId: id });
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
    set({ status: 'active' });
  },

  stop: async () => {
    await flushBuffer();
    const { sessionId } = get();
    if (sessionId) {
      await finalizeMonitoringSession(sessionId, Date.now()).catch(() => {});
    }
    set({ status: 'idle', startedAt: null, sessionId: null, currentBpm: null });
  },
}));
