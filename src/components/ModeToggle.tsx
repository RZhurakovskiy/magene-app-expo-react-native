import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WorkoutMode } from '../types';
import { colors, radii, spacing } from '../theme';

interface Props {
  mode: WorkoutMode;
  selected: WorkoutMode;
  onSelect: (mode: WorkoutMode) => void;
}

const CONFIG: Record<WorkoutMode, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  treadmill: { label: 'Беговая дорожка', icon: 'walk' },
  outdoor: { label: 'Улица', icon: 'location' },
};

export function ModeOption({ mode, selected, onSelect }: Props) {
  const isActive = mode === selected;
  const { label, icon } = CONFIG[mode];

  return (
    <TouchableOpacity
      style={[styles.option, isActive && styles.optionActive]}
      onPress={() => onSelect(mode)}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={22} color={isActive ? colors.accentStart : colors.textSecondary} />
      <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ModeSelector({ selected, onSelect }: { selected: WorkoutMode; onSelect: (mode: WorkoutMode) => void }) {
  return (
    <View style={styles.row}>
      <ModeOption mode="treadmill" selected={selected} onSelect={onSelect} />
      <ModeOption mode="outdoor" selected={selected} onSelect={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  option: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionActive: {
    borderColor: colors.accentStart,
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  labelActive: {
    color: colors.textPrimary,
  },
});
