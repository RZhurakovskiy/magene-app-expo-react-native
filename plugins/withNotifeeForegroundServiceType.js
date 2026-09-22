const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const SERVICE_NAME = 'app.notifee.core.ForegroundService';
const SERVICE_TYPE = 'connectedDevice';

module.exports = function withNotifeeForegroundServiceType(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    AndroidConfig.Manifest.ensureToolsAvailable(manifest);

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    if (!Array.isArray(application.service)) {
      application.service = [];
    }

    let service = application.service.find((item) => item.$?.['android:name'] === SERVICE_NAME);
    if (!service) {
      service = { $: { 'android:name': SERVICE_NAME } };
      application.service.push(service);
    }

    service.$['android:foregroundServiceType'] = SERVICE_TYPE;
    service.$['tools:replace'] = 'android:foregroundServiceType';

    return cfg;
  });
};
