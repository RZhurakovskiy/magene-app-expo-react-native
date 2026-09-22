import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/location/backgroundLocation';
import './src/monitoring/foregroundService';
import { initDatabase } from './src/db/database';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useProfileStore } from './src/store/profileStore';
import { useSessionStore } from './src/store/sessionStore';
import { colors } from './src/theme';

const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.background },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const loadLastKnownDevice = useSessionStore((s) => s.loadLastKnownDevice);

  useEffect(() => {
    initDatabase()
      .then(() => Promise.all([loadProfile(), loadLastKnownDevice()]))
      .finally(() => setReady(true));
  }, [loadProfile, loadLastKnownDevice]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
