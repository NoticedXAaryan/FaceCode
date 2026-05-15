import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';

type Ring = 'gradient' | 'green' | 'none';
type Props = { size: number; uri?: string; initials?: string; showRing?: boolean; ringColor?: Ring };

export default function Avatar({ size, uri, initials = 'FT', showRing, ringColor = 'none' }: Props) {
  const inner = size - 6;
  const body = uri ? (
    <Image source={{ uri }} style={[s.image, { width: inner, height: inner, borderRadius: theme.radius.avatar }]} />
  ) : (
    <View style={[s.fallback, { width: inner, height: inner, borderRadius: theme.radius.avatar }]}>
      <Text style={s.initials}>{initials}</Text>
    </View>
  );

  if (!showRing || ringColor === 'none') return <View style={[s.plain, { width: size, height: size, borderRadius: theme.radius.avatar }]}>{body}</View>;
  if (ringColor === 'green') return <View style={[s.green, { width: size, height: size, borderRadius: theme.radius.avatar }]}>{body}</View>;
  return (
    <LinearGradient colors={[theme.colors.accentFrom, theme.colors.accentTo]} style={[s.gradient, { width: size, height: size, borderRadius: theme.radius.avatar }]}>
      {body}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  plain: { alignItems: 'center', justifyContent: 'center' },
  gradient: { alignItems: 'center', justifyContent: 'center', padding: 3 },
  green: { alignItems: 'center', justifyContent: 'center', padding: 3, borderWidth: 2, borderColor: theme.colors.success },
  image: { backgroundColor: theme.colors.surface2 },
  fallback: { backgroundColor: theme.colors.surface2, alignItems: 'center', justifyContent: 'center' },
  initials: { color: theme.colors.textPrimary, fontFamily: theme.typography.button.fontFamily, fontSize: 14 }
});
