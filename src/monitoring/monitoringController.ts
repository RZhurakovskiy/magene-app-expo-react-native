import { recoverIfStale } from '../ble/connectionManager';
import { useMonitoringStore } from '../store/monitoringStore';
import {
  requestNotificationPermission,
  startMonitoringForegroundService,
  stopMonitoringForegroundService,
  updateMonitoringNotification,
} from './foregroundService';

const STALE_SAMPLE_MS = 20000;

let notificationTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;

function clearTimers(): void {
  if (notificationTimer) {
    clearInterval(notificationTimer);
    notificationTimer = null;
  }
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

function notificationBody(): string {
  const { status, currentBpm } = useMonitoringStore.getState();
  if (status === 'paused') return 'На паузе';
  return currentBpm ? `Текущий пульс: ${currentBpm} уд/мин` : 'Ожидание данных с датчика…';
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
      updateMonitoringNotification(notificationBody()).catch(() => {});
    }, 30000);
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
  updateMonitoringNotification(notificationBody()).catch(() => {});
}

export function resumeMonitoring(): void {
  useMonitoringStore.getState().resume();
  updateMonitoringNotification(notificationBody()).catch(() => {});
}

export async function stopMonitoring(): Promise<void> {
  clearTimers();
  await useMonitoringStore.getState().stop();
  await stopMonitoringForegroundService().catch(() => {});
}
