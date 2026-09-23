import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listMonitoringSessions, MonitoringSession } from '../db/database';
import { useBiometricGate } from '../hooks/useBiometricGate';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing } from '../theme';
import { formatDuration, formatSessionDateTime } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'MonitoringHistory'>;

export function MonitoringHistoryScreen({ navigation }: Props) {
  const unlocked = useBiometricGate();
  const [sessions, setSessions] = useState<MonitoringSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!unlocked) return;
      listMonitoringSessions().then(setSessions);
    }, [unlocked]),
  );

  if (!unlocked) return <SafeAreaView style={styles.safe} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>История мониторинга</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        ListEmptyComponent={<Text style={styles.empty}>Пока нет сессий мониторинга</Text>}
        renderItem={({ item }) => {
          const isSleep = item.kind === 'sleep';
          const durationSec = item.endedAt ? Math.round((item.endedAt - item.startedAt) / 1000) : 0;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('MonitoringSession', { sessionId: item.id })}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={isSleep ? 'moon' : 'pulse'} size={18} color={colors.accentStart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {isSleep ? 'Сон' : 'Мониторинг'} · {formatSessionDateTime(item.startedAt)}
                </Text>
                <Text style={styles.rowSubtitle}>
                  {formatDuration(durationSec)}
                  {item.avgBpm != null ? ` · средний ${item.avgBpm}` : ''}
                  {item.restingBpm != null ? ` · покой ${item.restingBpm}` : ''}
                  {item.hasRr && item.avgHrvMs != null ? ` · HRV ${item.avgHrvMs} мс` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          );
        }}
      />
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
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    fontSize: 14,
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
});
