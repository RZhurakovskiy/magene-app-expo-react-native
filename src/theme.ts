export const colors = {
  background: '#0B0B10',
  surface: '#17171F',
  surfaceAlt: '#1E1E28',
  border: '#2A2A36',
  textPrimary: '#F5F5F7',
  textSecondary: '#9A9AA6',
  textMuted: '#6B6B76',
  accentStart: '#FF8A3D',
  accentEnd: '#FF3B5C',
  danger: '#FF3B5C',
  success: '#3DDC97',
  info: '#5AC8FA',
} as const;

export const gradients = {
  accent: [colors.accentStart, colors.accentEnd] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 56, fontWeight: '800' as const },
  title: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
};
