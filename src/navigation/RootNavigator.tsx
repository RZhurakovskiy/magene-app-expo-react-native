import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActiveWorkoutScreen } from '../screens/ActiveWorkoutScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MonitoringDayScreen } from '../screens/MonitoringDayScreen';
import { MonitoringHistoryScreen } from '../screens/MonitoringHistoryScreen';
import { MonitoringOnboardingScreen } from '../screens/MonitoringOnboardingScreen';
import { MonitoringScreen } from '../screens/MonitoringScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ScanDeviceScreen } from '../screens/ScanDeviceScreen';
import { SessionDetailsScreen } from '../screens/SessionDetailsScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { WorkoutSummaryScreen } from '../screens/WorkoutSummaryScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ScanDevice" component={ScanDeviceScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="SessionDetails" component={SessionDetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="Monitoring" component={MonitoringScreen} />
      <Stack.Screen name="MonitoringOnboarding" component={MonitoringOnboardingScreen} />
      <Stack.Screen name="MonitoringHistory" component={MonitoringHistoryScreen} />
      <Stack.Screen name="MonitoringDay" component={MonitoringDayScreen} />
    </Stack.Navigator>
  );
}
