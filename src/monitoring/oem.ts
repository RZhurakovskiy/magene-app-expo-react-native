import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';

const APP_PACKAGE = 'com.pulsetracker.app';

export type OemFamily = 'xiaomi' | 'huawei' | 'oppo' | 'vivo' | 'samsung' | 'other';

export function detectOemFamily(): OemFamily {
  const signature = `${Device.manufacturer ?? ''} ${Device.brand ?? ''}`.toLowerCase();
  if (/xiaomi|redmi|poco/.test(signature)) return 'xiaomi';
  if (/huawei|honor/.test(signature)) return 'huawei';
  if (/oppo|realme|oneplus/.test(signature)) return 'oppo';
  if (/vivo|iqoo/.test(signature)) return 'vivo';
  if (/samsung/.test(signature)) return 'samsung';
  return 'other';
}

export async function openAppDetailsSettings(): Promise<void> {
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
    data: `package:${APP_PACKAGE}`,
  }).catch(() => {});
}

export async function openAutoStartSettings(): Promise<void> {
  if (detectOemFamily() === 'xiaomi') {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        packageName: 'com.miui.securitycenter',
        className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
      });
      return;
    } catch {
      // MIUI activity unavailable on this ROM version — fall back to app settings.
    }
  }
  await openAppDetailsSettings();
}
