export const colors = {
  background: '#000000',
  surface: '#111111',
  surface2: '#1C1C1E',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  accentFrom: '#833AB4',
  accentTo: '#FD1D1D',
  accentMid: '#E1306C',
  accent: '#6C5CE7',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.3)',
  success: '#22C55E',
  danger: '#EF4444',
  verified: '#3B82F6',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

// Backward-compatible alias so existing screens that reference `theme.colors`, `theme.typography`, etc.
// continue to work without mass refactoring every file at once.
export const theme = {
  colors,
  typography: {
    display: { fontFamily: fonts.bold, fontSize: 32, letterSpacing: -0.5 },
    title: { fontFamily: fonts.semibold, fontSize: 20 },
    body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
    caption: { fontFamily: fonts.regular, fontSize: 12 },
    button: { fontFamily: fonts.semibold, fontSize: 15 },
  },
  spacing: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 },
  radius: { small: 8, medium: 12, large: 20, pill: 999, avatar: 999 },
} as const;
