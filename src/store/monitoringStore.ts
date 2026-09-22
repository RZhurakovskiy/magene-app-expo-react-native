import { create } from 'zustand';
import { insertMonitoringMinute } from '../db/database';

export type MonitoringStatus = 'idle' | 'active' | 'paused';

function minuteStart(ts: number): number {
  return Math.floor(ts / 60000) * 60000;
}

let bufferMinuteTs = 0;
let bufferSamples: number[] = [];

async function flushBuffer(): Promise<void> {
  if (bufferSamples.length === 0) return;
  const samples = bufferSamples;
  const minuteTs = bufferMinuteTs;
  bufferSamples = [];

  const sum = samples.reduce((a, b) => a + b, 0);
  await insertMonitoringMinute({
    minuteTs,
    avgBpm: Math.round(sum / samples.length),
    minBpm: Math.min(...samples),
    maxBpm: Math.max(...samples),
    sampleCount: samples.length,
  }).catch(() => {});
}

interface MonitoringState {
  status: MonitoringStatus;
  startedAt: number | null;
  currentBpm: number | null;

  onSample: (bpm: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
}

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  status: 'idle',
  startedAt: null,
  currentBpm: null,

  onSample: (bpm) => {
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
  },

  start: () => {
    bufferSamples = [];
    bufferMinuteTs = minuteStart(Date.now());
    set({ status: 'active', startedAt: Date.now() });
  },

  pause: () => {
    flushBuffer();
    set({ status: 'paused' });
  },

  resume: () => {
    bufferSamples = [];
    bufferMinuteTs = minuteStart(Date.now());
    set({ status: 'active' });
  },

  stop: async () => {
    await flushBuffer();
    set({ status: 'idle', startedAt: null, currentBpm: null });
  },
}));
