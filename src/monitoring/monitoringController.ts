import { useMonitoringStore } from '../store/monitoringStore';
import {
  requestNotificationPermission,
  startMonitoringForegroundService,
  stopMonitoringForegroundService,
  updateMonitoringNotification,
} from './foregroundService';

let notificationTimer: ReturnType<typeof setInterval> | null = null;

function clearTimer(): void {
  if (notificationTimer) {
    clearInterval(notificationTimer);
    notificationTimer = null;
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

    clearTimer();
    notificationTimer = setInterval(() => {
      if (useMonitoringStore.getState().status === 'idle') return;
      updateMonitoringNotification(notificationBody()).catch(() => {});
    }, 30000);

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
  clearTimer();
  await useMonitoringStore.getState().stop();
  await stopMonitoringForegroundService().catch(() => {});
}
