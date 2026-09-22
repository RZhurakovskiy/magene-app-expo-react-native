import { PermissionsAndroid, Platform } from 'react-native';
import { BleError, BleManager, Device, State, Subscription } from 'react-native-ble-plx';

export const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
export const HEART_RATE_MEASUREMENT_UUID = '00002a37-0000-1000-8000-00805f9b34fb';
export const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
export const BATTERY_LEVEL_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

// Reuse one BleManager across Fast Refresh reloads. Each `new BleManager()`
// registers Android BroadcastReceivers (adapter/location state); recreating it
// on every hot reload leaks them until "Too many receivers" (1000 limit).
const bleManagerRef = globalThis as unknown as { __bleManager?: BleManager };
const manager = bleManagerRef.__bleManager ?? (bleManagerRef.__bleManager = new BleManager());

function base64ToBytes(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = chars.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

export interface HeartRateSample {
  bpm: number;
  rr: number[]; // RR-intervals in ms, empty if the sensor does not send them
}

export function parseHeartRateMeasurement(base64Value: string): HeartRateSample {
  const bytes = base64ToBytes(base64Value);
  const flags = bytes[0];

  let offset: number;
  let bpm: number;
  if ((flags & 0x01) === 1) {
    bpm = bytes[1] | (bytes[2] << 8);
    offset = 3;
  } else {
    bpm = bytes[1];
    offset = 2;
  }

  if ((flags & 0x08) !== 0) {
    offset += 2; // Energy Expended field present
  }

  const rr: number[] = [];
  if ((flags & 0x10) !== 0) {
    for (let i = offset; i + 1 < bytes.length; i += 2) {
      const raw = bytes[i] | (bytes[i + 1] << 8);
      rr.push(Math.round((raw / 1024) * 1000));
    }
  }

  return { bpm, rr };
}

export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function waitForPoweredOn(): Promise<void> {
  return new Promise((resolve) => {
    const subscription = manager.onStateChange((state) => {
      if (state === State.PoweredOn) {
        subscription.remove();
        resolve();
      }
    }, true);
  });
}

export function scanForHeartRateDevices(
  onDeviceFound: (device: Device) => void,
  onError: (error: BleError) => void,
): () => void {
  manager.startDeviceScan([HEART_RATE_SERVICE_UUID], null, (error, device) => {
    if (error) {
      onError(error);
      return;
    }
    if (device) {
      onDeviceFound(device);
    }
  });

  return () => manager.stopDeviceScan();
}

export async function connectToDevice(deviceId: string): Promise<Device> {
  const device = await manager.connectToDevice(deviceId, { timeout: 10000 });
  await device.discoverAllServicesAndCharacteristics();
  return device;
}

export function subscribeToHeartRate(
  device: Device,
  onSample: (sample: HeartRateSample) => void,
  onDisconnected: () => void,
): Subscription {
  device.onDisconnected(() => onDisconnected());

  return device.monitorCharacteristicForService(
    HEART_RATE_SERVICE_UUID,
    HEART_RATE_MEASUREMENT_UUID,
    (error, characteristic) => {
      if (error) {
        return;
      }
      if (characteristic?.value) {
        onSample(parseHeartRateMeasurement(characteristic.value));
      }
    },
  );
}

export async function readBatteryLevel(device: Device): Promise<number | null> {
  try {
    const characteristic = await device.readCharacteristicForService(BATTERY_SERVICE_UUID, BATTERY_LEVEL_UUID);
    if (!characteristic.value) return null;
    return base64ToBytes(characteristic.value)[0];
  } catch {
    return null;
  }
}

export async function disconnectDevice(deviceId: string): Promise<void> {
  const isConnected = await manager.isDeviceConnected(deviceId).catch(() => false);
  if (isConnected) {
    await manager.cancelDeviceConnection(deviceId);
  }
}

export function destroyBleManager(): void {
  manager.destroy();
}
