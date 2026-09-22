import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../components/GradientButton';
import { setFlag } from '../db/database';
import { detectOemFamily, openAppDetailsSettings, openAutoStartSettings } from '../monitoring/oem';
import { MONITORING_ONBOARDING_FLAG } from '../monitoring/flags';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MonitoringOnboarding'>;

interface Step {
  title: string;
  body: string;
  action?: { label: string; run: () => void };
}

function stepsForFamily(family: ReturnType<typeof detectOemFamily>): Step[] {
  if (family === 'xiaomi') {
    return [
      {
        title: '1. Автозапуск',
        body: 'Включи автозапуск для Pulse — иначе система закроет приложение через несколько минут после блокировки экрана.',
        action: { label: 'Открыть автозапуск', run: () => void openAutoStartSettings() },
      },
      {
        title: '2. Экономия батареи → Без ограничений',
        body: 'В настройках приложения открой «Экономия батареи» и выбери «Без ограничений». Это не даёт MIUI усыплять фоновый мониторинг.',
        action: { label: 'Открыть настройки приложения', run: () => void openAppDetailsSettings() },
      },
    ];
  }
  return [
    {
      title: 'Отключи ограничения батареи',
      body: 'В настройках приложения сними ограничения энергопотребления / разреши работу в фоне, иначе система может закрыть мониторинг при заблокированном экране.',
      action: { label: 'Открыть настройки приложения', run: () => void openAppDetailsSettings() },
    },
  ];
}

export function MonitoringOnboardingScreen({ navigation }: Props) {
  const family = useMemo(() => detectOemFamily(), []);
  const steps = useMemo(() => stepsForFamily(family), [family]);

  const handleDone = async () => {
    await setFlag(MONITORING_ONBOARDING_FLAG, 'true');
    navigation.replace('Monitoring');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Настройка фона</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}>
        <Text style={styles.intro}>
          Чтобы пульс писался весь день при выключенном экране, разреши приложению работать в фоне. Это разовая
          настройка.
        </Text>

        {steps.map((step) => (
          <View key={step.title} style={styles.card}>
            <Text style={styles.cardTitle}>{step.title}</Text>
            <Text style={styles.cardBody}>{step.body}</Text>
            {step.action && (
              <TouchableOpacity style={styles.actionBtn} onPress={step.action.run}>
                <Ionicons name="open-outline" size={16} color={colors.accentStart} />
                <Text style={styles.actionLabel}>{step.action.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <GradientButton label="Готово" onPress={handleDone} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
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
  intro: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionLabel: {
    color: colors.accentStart,
    fontSize: 14,
    fontWeight: '600',
  },
});
