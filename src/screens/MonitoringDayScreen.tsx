import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartRateChart } from '../components/HeartRateChart';
import { StatTile } from '../components/StatTile';
import { listMonitoringMinutesBetween, MonitoringMinute } from '../db/database';
import { useBiometricGate } from '../hooks/useBiometricGate';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { formatSessionDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'MonitoringDay'>;

export function MonitoringDayScreen({ route, navigation }: Props) {
  const unlocked = useBiometricGate();
  const { dayTs } = route.params;
  const [minutes, setMinutes] = useState<MonitoringMinute[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!unlocked) return;
      listMonitoringMinutesBetween(dayTs, dayTs + 24 * 60 * 60 * 1000).then(setMinutes);
    }, [unlocked, dayTs]),
  );

  const stats = useMemo(() => {
    if (minutes.length === 0) return null;
    let weighted = 0;
    let samples = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const m of minutes) {
      weighted += m.avgBpm * m.sampleCount;
      samples += m.sampleCount;
      min = Math.min(min, m.minBpm);
      max = Math.max(max, m.maxBpm);
    }
    return { avg: Math.round(weighted / samples), min, max };
  }, [minutes]);

  const chartSamples = useMemo(() => minutes.map((m) => ({ t: m.minuteTs, bpm: m.avgBpm })), [minutes]);

  if (!unlocked) return <SafeAreaView style={styles.safe} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{formatSessionDate(dayTs)}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        {stats && (
          <View style={styles.row}>
            <StatTile icon="heart-outline" value={String(stats.avg)} label="средний" />
            <StatTile icon="trending-down-outline" value={String(stats.min)} label="мин" />
            <StatTile icon="trending-up-outline" value={String(stats.max)} label="макс" />
          </View>
        )}
        <HeartRateChart samples={chartSamples} title="Пульс за день" height={160} />
        <Text style={styles.note}>{minutes.length} минут записано</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  note: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
