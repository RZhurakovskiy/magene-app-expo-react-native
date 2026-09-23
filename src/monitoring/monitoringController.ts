import { recoverIfStale } from '../ble/connectionManager';
import { useMonitoringStore } from '../store/monitoringStore';
import {
  requestNotificationPermission,
  startMonitoringForegroundService,
  stopMonitoringForegroundService,
  updateMonitoringNotification,
} from './foregroundService';

const STALE_SAMPLE_MS = 20000;
// The notification content refreshes on this cadence. Kept short so the
// lock-screen BPM tracks the live value instead of looking frozen; the
// channel is LOW importance + onlyAlertOnce, so updates are silent.
const NOTIFICATION_REFRESH_MS = 2000;

let notificationTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastNotificationBody: string | null = null;

function clearTimers(): void {
  if (notificationTimer) {
    clearInterval(notificationTimer);
    notificationTimer = null;
  }
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
  lastNotificationBody = null;
}

function notificationBody(): string {
  const { status, currentBpm } = useMonitoringStore.getState();
  if (status === 'paused') return 'На паузе';
  return currentBpm ? `Текущий пульс: ${currentBpm} уд/мин` : 'Ожидание данных с датчика…';
}

// Push the notification only when its text actually changed, so a steady BPM
// doesn't trigger a native update every tick.
function refreshNotification(): void {
  const body = notificationBody();
  if (body === lastNotificationBody) return;
  lastNotificationBody = body;
  updateMonitoringNotification(body).catch(() => {});
}

export async function startMonitoring(): Promise<boolean> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    await startMonitoringForegroundService(useMonitoringStore.getState().currentBpm);
    useMonitoringStore.getState().start();

    clearTimers();
    notificationTimer = setInterval(() => {
      if (useMonitoringStore.getState().status === 'idle') return;
      refreshNotification();
    }, NOTIFICATION_REFRESH_MS);
    watchdogTimer = setInterval(() => {
      if (useMonitoringStore.getState().status !== 'active') return;
      recoverIfStale(STALE_SAMPLE_MS).catch(() => {});
    }, 10000);

    return true;
  } catch {
    return false;
  }
}

export function pauseMonitoring(): void {
  useMonitoringStore.getState().pause();
  refreshNotification();
}

export function resumeMonitoring(): void {
  useMonitoringStore.getState().resume();
  refreshNotification();
}

export async function stopMonitoring(): Promise<void> {
  clearTimers();
  await useMonitoringStore.getState().stop();
  await stopMonitoringForegroundService().catch(() => {});
}
