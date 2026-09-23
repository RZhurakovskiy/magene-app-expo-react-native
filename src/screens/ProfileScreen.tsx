import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../components/GradientButton';
import { RootStackParamList } from '../navigation/types';
import { useProfileStore } from '../store/profileStore';
import { colors, fonts, radii, spacing } from '../theme';
import { Gender } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const [weight, setWeight] = useState(profile ? String(profile.weightKg) : '');
  const [age, setAge] = useState(profile ? String(profile.age) : '');
  const [gender, setGender] = useState<Gender>(profile?.gender ?? 'male');
  const [saving, setSaving] = useState(false);

  const weightValue = Number(weight.replace(',', '.'));
  const ageValue = Number(age);
  const isValid = weightValue > 0 && weightValue < 300 && ageValue > 0 && ageValue < 120;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await updateProfile({ weightKg: weightValue, age: ageValue, gender });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Профиль</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text style={styles.hint}>
        Нужно для расчёта калорий и пульсовых зон — используется только локально на устройстве.
      </Text>

      <Text style={styles.label}>ВЕС, КГ</Text>
      <TextInput
        style={styles.input}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        placeholder="70"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>ВОЗРАСТ</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
        placeholder="30"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>ПОЛ</Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[styles.genderOption, gender === 'male' && styles.genderOptionActive]}
          onPress={() => setGender('male')}
        >
          <Text style={[styles.genderLabel, gender === 'male' && styles.genderLabelActive]}>Мужской</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderOption, gender === 'female' && styles.genderOptionActive]}
          onPress={() => setGender('female')}
        >
          <Text style={[styles.genderLabel, gender === 'female' && styles.genderLabelActive]}>Женский</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }} />

      <GradientButton label="Сохранить" onPress={handleSave} disabled={!isValid} loading={saving} />
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
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: spacing.xl,
    lineHeight: 18,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  genderOptionActive: {
    borderColor: colors.accentStart,
    backgroundColor: colors.surfaceAlt,
  },
  genderLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontWeight: '600',
  },
  genderLabelActive: {
    color: colors.textPrimary,
  },
});
