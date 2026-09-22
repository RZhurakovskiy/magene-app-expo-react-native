import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listMonitoringDays, MonitoringDaySummary } from '../db/database';
import { useBiometricGate } from '../hooks/useBiometricGate';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing } from '../theme';
import { formatSessionDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'MonitoringHistory'>;

export function MonitoringHistoryScreen({ navigation }: Props) {
  const unlocked = useBiometricGate();
  const [days, setDays] = useState<MonitoringDaySummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!unlocked) return;
      listMonitoringDays().then(setDays);
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
        data={days}
        keyExtractor={(item) => String(item.dayTs)}
        contentContainerStyle={{ gap: spacing.sm }}
        ListEmptyComponent={<Text style={styles.empty}>Пока нет данных мониторинга</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('MonitoringDay', { dayTs: item.dayTs })}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="pulse" size={18} color={colors.accentStart} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{formatSessionDate(item.dayTs)}</Text>
              <Text style={styles.rowSubtitle}>
                средний {item.avgBpm} · {item.minBpm}–{item.maxBpm} уд/мин · {item.minutesTracked} мин
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
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
    fontSize: 17,
    fontWeight: '700',
  },
  empty: {
    color: colors.textMuted,
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
    fontWeight: '600',
    fontSize: 14,
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
