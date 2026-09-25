import { requestNotificationPermission, startWorkoutForegroundService, stopMonitoringForegroundService } from '../monitoring/foregroundService';
import { useMonitoringStore } from '../store/monitoringStore';

// Foreground service for a workout: without it Android freely kills the app in
// the background (low battery, battery saver), taking the workout with it.
export async function beginWorkoutService(): Promise<void> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    await startWorkoutForegroundService();
  } catch {
    // the workout still runs, just without the extra protection
  }
}

// Monitoring owns the service while it runs; only stop it if it's idle.
export async function endWorkoutService(): Promise<void> {
  if (useMonitoringStore.getState().status !== 'idle') return;
  await stopMonitoringForegroundService().catch(() => {});
}
