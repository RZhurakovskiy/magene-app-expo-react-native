import { saveKnownDevice } from '../db/database';
import { useMonitoringStore } from '../store/monitoringStore';
import { useSessionStore } from '../store/sessionStore';
import { ConnectionSupervisor, createConnectionSupervisor, LinkTarget } from './connectionSupervisor';
import { ContactDetector, createContactDetector } from './contactDetector';
import { bleLink } from './heartRate';
import { parseHeartRateMeasurement } from './hrParser';

const MIN_VALID_BPM = 20;
const LOG_LIMIT = 300;

// Last connection events, kept in memory so they can be shared from the phone
// (release builds have no Metro console to read them from).
const bleLog: string[] = [];

function logBle(message: string, error?: unknown): void {
  const detail = error instanceof Error ? `: ${error.message}` : error ? `: ${String(error)}` : '';
  const line = `${new Date().toLocaleTimeString('ru-RU')} ${message}${detail}`;
  bleLog.push(line);
  if (bleLog.length > LOG_LIMIT) bleLog.splice(0, bleLog.length - LOG_LIMIT);
  console.log(`[ble] ${line}`);
}

export function getBleLog(): string {
  return bleLog.length > 0 ? bleLog.join('\n') : 'Журнал пуст';
}

function isSensorNeeded(): boolean {
  return useSessionStore.getState().activeWorkout !== null || useMonitoringStore.getState().status !== 'idle';
}

// Contact knowledge (does this strap send RR / report contact) is per sensor.
let contactDetector: ContactDetector = createContactDetector({ minValidBpm: MIN_VALID_BPM });
let contactDeviceId: string | null = null;

function clearLiveReadings(): void {
  useMonitoringStore.getState().clearLiveBpm();
  useSessionStore.getState().clearCurrentBpm();
}

function handleMeasurement(value: string): void {
  const sample = parseHeartRateMeasurement(value);
  const verdict = contactDetector.push(sample, Date.now());

  const session = useSessionStore.getState();
  const contact = verdict.hasContact ? 'ok' : 'lost';
  if (session.sensorContact !== contact) {
    logBle(verdict.hasContact ? 'skin contact ok' : `no skin contact (${verdict.reason})`);
    session.setSensorContact(contact);
  }

  if (!verdict.hasContact) {
    // The strap is not on the skin (or reads nothing): what it sends now is a
    // frozen or empty value, so keep it out of the live view and the records.
    clearLiveReadings();
    return;
  }

  session.addHrSample(sample.bpm);
  useMonitoringStore.getState().onSample(sample.bpm, sample.rr);
}

function createSupervisor(): ConnectionSupervisor {
  return createConnectionSupervisor(bleLink, {
    onStatus: (status) => {
      logBle(`status: ${status}`);
      useSessionStore.getState().setConnectionStatus(status);
    },

    onConnected: (target) => {
      if (contactDeviceId !== target.id) {
        contactDetector = createContactDetector({ minValidBpm: MIN_VALID_BPM });
        contactDeviceId = target.id;
      }
      contactDetector.onConnected(Date.now());

      const store = useSessionStore.getState();
      store.setSensorContact('unknown');
      store.setConnectedDevice(target);
      store.setLastKnownDevice(target);
      saveKnownDevice(target).catch(() => {});
    },

    onLinkDown: () => {
      const store = useSessionStore.getState();
      store.setConnectedDevice(null);
      store.setSensorContact('unknown');
      clearLiveReadings();
    },

    onValue: handleMeasurement,
    shouldReconnect: isSensorNeeded,
    log: logBle,
  });
}

// One supervisor per JS runtime. On a Fast Refresh the previous instance still
// owns listeners on the shared BleManager, so retire it and pick its device up.
const supervisorRef = globalThis as unknown as { __hrSupervisor?: ConnectionSupervisor };
const previousSupervisor = supervisorRef.__hrSupervisor;
const resumeTarget: LinkTarget | null = previousSupervisor?.isConnected() ? previousSupervisor.getTarget() : null;
previousSupervisor?.dispose();
const supervisor = createSupervisor();
supervisorRef.__hrSupervisor = supervisor;
if (resumeTarget) supervisor.connect(resumeTarget).catch(() => {});

// Connects to the strap (or joins a connection already in progress). A no-op
// when that strap is already connected. Rejects if the attempt fails; while a
// workout or monitoring is running the reconnect loop keeps trying regardless.
export function connectAndSubscribe(deviceId: string, deviceName: string): Promise<void> {
  return supervisor.connect({ id: deviceId, name: deviceName });
}

// "Try again now" from the UI: skips the backoff wait of the reconnect loop.
export function retryConnectionNow(): void {
  const device = useSessionStore.getState().lastKnownDevice;
  if (!device) return;
  logBle('manual retry');
  supervisor.connect(device).catch(() => {});
}

// Catches "silent" BLE drops where Android never reports a disconnect: if a
// connected strap has sent nothing for staleMs, force one reconnect cycle.
export function recoverIfStale(staleMs: number): Promise<void> {
  return supervisor.checkStale(staleMs);
}
