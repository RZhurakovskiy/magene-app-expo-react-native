import { Device } from 'react-native-ble-plx';
import { saveKnownDevice } from '../db/database';
import { useMonitoringStore } from '../store/monitoringStore';
import { useSessionStore } from '../store/sessionStore';
import { connectToDevice, subscribeToHeartRate } from './heartRate';

const MAX_RECONNECT_ATTEMPTS = 6;

let activeDevice: Device | null = null;

function isMonitoringActive(): boolean {
  return useMonitoringStore.getState().status !== 'idle';
}

export async function connectAndSubscribe(deviceId: string, deviceName: string): Promise<void> {
  const store = useSessionStore.getState();
  store.setConnectionStatus('connecting');

  const device = await connectToDevice(deviceId);
  activeDevice = device;

  subscribeToHeartRate(
    device,
    (bpm) => {
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

  if (store.activeWorkout || isMonitoringActive()) {
    attemptReconnect(deviceId, deviceName, 1);
  } else {
    store.setConnectionStatus('disconnected');
  }
}

function attemptReconnect(deviceId: string, deviceName: string, attempt: number) {
  const store = useSessionStore.getState();
  store.setConnectionStatus('reconnecting');

  const delayMs = Math.min(1000 * attempt, 5000);
  setTimeout(async () => {
    try {
      await connectAndSubscribe(deviceId, deviceName);
    } catch {
      const stillNeeded = useSessionStore.getState().activeWorkout || isMonitoringActive();
      if (attempt < MAX_RECONNECT_ATTEMPTS && stillNeeded) {
        attemptReconnect(deviceId, deviceName, attempt + 1);
      } else {
        useSessionStore.getState().setConnectionStatus('disconnected');
      }
    }
  }, delayMs);
}

export function getActiveDevice(): Device | null {
  return activeDevice;
}
