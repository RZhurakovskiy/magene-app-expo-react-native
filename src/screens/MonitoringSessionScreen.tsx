import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartRateChart } from '../components/HeartRateChart';
import { StatTile } from '../components/StatTile';
import {
  getMonitoringSession,
  listMonitoringMinutesBetween,
  MonitoringMinute,
  MonitoringSession,
} from '../db/database';
import { useBiometricGate } from '../hooks/useBiometricGate';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing } from '../theme';
import { formatDuration, formatSessionDateTime } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'MonitoringSession'>;

export function MonitoringSessionScreen({ route, navigation }: Props) {
  const unlocked = useBiometricGate();
  const { sessionId } = route.params;
  const [session, setSession] = useState<MonitoringSession | null>(null);
  const [minutes, setMinutes] = useState<MonitoringMinute[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!unlocked) return;
      getMonitoringSession(sessionId).then((s) => {
        setSession(s);
        if (s?.endedAt) {
          listMonitoringMinutesBetween(s.startedAt, s.endedAt).then(setMinutes);
        }
      });
    }, [unlocked, sessionId]),
  );

  const chartSamples = useMemo(() => minutes.map((m) => ({ t: m.minuteTs, bpm: m.avgBpm })), [minutes]);
  const hrvSamples = useMemo(
    () => minutes.filter((m) => m.avgHrvMs != null).map((m) => ({ t: m.minuteTs, bpm: m.avgHrvMs as number })),
    [minutes],
  );
  // The HRV chart has no value axis, so its range is spelled out above it.
  const hrvRange = useMemo(() => {
    if (hrvSamples.length === 0) return null;
    const values = hrvSamples.map((s) => s.bpm);
    return {
      min: Math.min(...values),
      avg: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
      max: Math.max(...values),
    };
  }, [hrvSamples]);

  if (!unlocked || !session) return <SafeAreaView style={styles.safe} />;

  const isSleep = session.kind === 'sleep';
  const durationSec = session.endedAt ? Math.round((session.endedAt - session.startedAt) / 1000) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{isSleep ? 'Сон' : 'Мониторинг'}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing.md }}>
        <Text style={styles.subtitle}>{formatSessionDateTime(session.startedAt)}</Text>

        <View style={styles.row}>
          <StatTile icon="time-outline" value={formatDuration(durationSec)} label="длительность" />
          <StatTile icon="bed-outline" value={session.restingBpm != null ? String(session.restingBpm) : '—'} label="пульс покоя" />
        </View>

        <View style={styles.row}>
          <StatTile icon="heart-outline" value={session.avgBpm != null ? String(session.avgBpm) : '—'} label="средний" />
          <StatTile icon="trending-down-outline" value={session.minBpm != null ? String(session.minBpm) : '—'} label="мин" />
          <StatTile icon="trending-up-outline" value={session.maxBpm != null ? String(session.maxBpm) : '—'} label="макс" />
        </View>

        <HeartRateChart samples={chartSamples} title="Пульс за сессию" height={150} />

        <View style={styles.hrvCard}>
          <Text style={styles.hrvTitle}>Вариабельность (HRV)</Text>
          {session.hasRr && session.avgHrvMs != null ? (
            <>
              <Text style={styles.hrvValue}>{session.avgHrvMs} мс <Text style={styles.hrvUnit}>RMSSD, средн.</Text></Text>
              <Text style={styles.hrvNote}>Датчик передаёт RR-интервалы — HRV доступна.</Text>
            </>
          ) : (
            <Text style={styles.hrvNote}>Датчик не передаёт RR-интервалы — HRV по этой сессии недоступна.</Text>
          )}
        </View>

        {hrvSamples.length > 1 && hrvRange && (
          <>
            <View style={styles.row}>
              <StatTile icon="trending-down-outline" value={`${hrvRange.min} мс`} label="HRV мин" />
              <StatTile icon="pulse-outline" value={`${hrvRange.avg} мс`} label="HRV средн." />
              <StatTile icon="trending-up-outline" value={`${hrvRange.max} мс`} label="HRV макс" />
            </View>
            <HeartRateChart samples={hrvSamples} title="HRV за сессию (мс)" height={120} color={colors.info} />
          </>
        )}

        <Text style={styles.footer}>{session.minutesTracked ?? 0} минут записано</Text>
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
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hrvCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  hrvTitle: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    fontWeight: '600',
  },
  hrvValue: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 22,
    fontWeight: '700',
  },
  hrvUnit: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 12,
    fontWeight: '600',
  },
  hrvNote: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: spacing.lg,
  },
});
