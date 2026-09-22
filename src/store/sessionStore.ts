import { create } from 'zustand';
import { getKnownDevice } from '../db/database';
import { HrSample, RoutePoint, WorkoutMode } from '../types';

export type BleConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface KnownDevice {
  id: string;
  name: string;
}

export interface TargetZoneRange {
  min: number;
  max: number;
}

interface ActiveWorkout {
  mode: WorkoutMode;
  startedAt: number;
  hrSamples: HrSample[];
  route: RoutePoint[];
  currentBpm: number | null;
  targetZoneRange: TargetZoneRange | null;
}

interface SessionState {
  connectionStatus: BleConnectionStatus;
  connectedDevice: KnownDevice | null;
  lastKnownDevice: KnownDevice | null;
  activeWorkout: ActiveWorkout | null;

  setConnectionStatus: (status: BleConnectionStatus) => void;
  setConnectedDevice: (device: KnownDevice | null) => void;
  setLastKnownDevice: (device: KnownDevice) => void;
  loadLastKnownDevice: () => Promise<void>;

  startWorkout: (mode: WorkoutMode, targetZoneRange: TargetZoneRange | null) => void;
  addHrSample: (bpm: number) => void;
  appendRoutePoint: (point: RoutePoint) => void;
  endWorkout: () => ActiveWorkout | null;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  connectionStatus: 'disconnected',
  connectedDevice: null,
  lastKnownDevice: null,
  activeWorkout: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setConnectedDevice: (device) => set({ connectedDevice: device }),
  setLastKnownDevice: (device) => set({ lastKnownDevice: device }),
  loadLastKnownDevice: async () => {
    const device = await getKnownDevice();
    if (device) set({ lastKnownDevice: device });
  },

  startWorkout: (mode, targetZoneRange) =>
    set({
      activeWorkout: {
        mode,
        startedAt: Date.now(),
        hrSamples: [],
        route: [],
        currentBpm: null,
        targetZoneRange,
      },
    }),

  addHrSample: (bpm) => {
    const workout = get().activeWorkout;
    if (!workout) return;
    set({
      activeWorkout: {
        ...workout,
        currentBpm: bpm,
        hrSamples: [...workout.hrSamples, { t: Date.now(), bpm }],
      },
    });
  },

  appendRoutePoint: (point) => {
    const workout = get().activeWorkout;
    if (!workout) return;
    set({ activeWorkout: { ...workout, route: [...workout.route, point] } });
  },

  endWorkout: () => {
    const workout = get().activeWorkout;
    set({ activeWorkout: null });
    return workout;
  },
}));
