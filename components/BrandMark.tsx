import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export default function BrandMark({ size = 88 }: { size?: number }) {
  const inner = size - 8;
  return (
    <LinearGradient
      colors={[colors.accentFrom, colors.accentMid, colors.accentTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.ring, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View style={[s.core, { width: inner, height: inner, borderRadius: inner / 2 }]}>
        <Ionicons name="scan-outline" size={size * 0.4} color={colors.textPrimary} />
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  core: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
