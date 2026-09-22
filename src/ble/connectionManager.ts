import { Device } from 'react-native-ble-plx';
import { saveKnownDevice } from '../db/database';
import { useMonitoringStore } from '../store/monitoringStore';
import { useSessionStore } from '../store/sessionStore';
import { connectToDevice, disconnectDevice, subscribeToHeartRate } from './heartRate';

const MIN_VALID_BPM = 20;

let activeDevice: Device | null = null;
let currentTarget: { id: string; name: string } | null = null;
let lastSampleAt = 0;

function isSensorNeeded(): boolean {
  return useSessionStore.getState().activeWorkout !== null || useMonitoringStore.getState().status !== 'idle';
}

export async function connectAndSubscribe(deviceId: string, deviceName: string): Promise<void> {
  const store = useSessionStore.getState();
  store.setConnectionStatus('connecting');

  const device = await connectToDevice(deviceId);
  activeDevice = device;
  currentTarget = { id: deviceId, name: deviceName };
  lastSampleAt = Date.now();

  subscribeToHeartRate(
    device,
    (bpm) => {
      if (bpm < MIN_VALID_BPM) return;
      lastSampleAt = Date.now();
      useSessionStore.getState().addHrSample(bpm);
      useMonitoringStore.getState().onSample(bpm);
    },
    () => handleDisconnected(deviceId, deviceName),
  );

  store.setConnectedDevice({ id: deviceId, name: deviceName });
  store.setLastKnownDevice({ id: deviceId, name: deviceName });
  store.setConnectionStatus('connected');
  saveKnownDevice({ id: deviceId, name: deviceName }).catch(() => {});
}

function handleDisconnected(deviceId: string, deviceName: string) {
  const store = useSessionStore.getState();
  activeDevice = null;
  store.setConnectedDevice(null);

  if (isSensorNeeded()) {
    attemptReconnect(deviceId, deviceName, 1);
  } else {
    store.setConnectionStatus('disconnected');
  }
}

function attemptReconnect(deviceId: string, deviceName: string, attempt: number) {
  if (!isSensorNeeded()) {
    useSessionStore.getState().setConnectionStatus('disconnected');
    return;
  }
  useSessionStore.getState().setConnectionStatus('reconnecting');

  const delayMs = Math.min(1000 * attempt, 5000);
  setTimeout(async () => {
    if (!isSensorNeeded()) {
      useSessionStore.getState().setConnectionStatus('disconnected');
      return;
    }
    try {
      await connectAndSubscribe(deviceId, deviceName);
    } catch {
      attemptReconnect(deviceId, deviceName, attempt + 1);
    }
  }, delayMs);
}

// Catches "silent" BLE drops where onDisconnected never fires: if we believe we're
// connected but no valid sample has arrived for staleMs, force a reconnect cycle.
export async function recoverIfStale(staleMs: number): Promise<void> {
  if (!isSensorNeeded() || !currentTarget) return;
  if (useSessionStore.getState().connectionStatus !== 'connected') return;
  if (Date.now() - lastSampleAt < staleMs) return;

  const target = currentTarget;
  const dying = activeDevice;
  activeDevice = null;
  useSessionStore.getState().setConnectionStatus('reconnecting');
  if (dying) {
    await Promise.race([disconnectDevice(dying.id).catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
  }
  attemptReconnect(target.id, target.name, 1);
}

export function getActiveDevice(): Device | null {
  return activeDevice;
}
