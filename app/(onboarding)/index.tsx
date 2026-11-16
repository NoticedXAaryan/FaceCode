import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '@/components/UI/Button';
import { colors, fonts } from '@/constants/theme';

const slides = [
  {
    icon: 'scan-outline' as const,
    title: 'Scan a face',
    subtitle: 'Point FaceTag at someone who enrolled. Their public card opens like a QR code.',
  },
  {
    icon: 'link-outline' as const,
    title: 'One tap to connect',
    subtitle: 'Instagram, LinkedIn, WhatsApp, and whatever else they chose to share.',
  },
  {
    icon: 'lock-closed-outline' as const,
    title: 'You decide',
    subtitle: 'Stay private, remove your face signature, or delete the account whenever you want.',
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const current = slides[index];

  return (
    <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={s.top}>
        <Text style={s.brand}>FaceTag</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')}>
          <Text style={s.skip}>Skip</Text>
        </Pressable>
      </View>
      <View style={s.slide}>
        <LinearGradient colors={[colors.accentFrom, colors.accentTo]} style={s.orb}>
          <Ionicons name={current.icon} size={42} color="#fff" />
        </LinearGradient>
        <Text style={s.title}>{current.title}</Text>
        <Text style={s.sub}>{current.subtitle}</Text>
      </View>
      <View style={s.footer}>
        <View style={s.dots}>
          {slides.map((_, i) => (
            <View key={slides[i].title} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>
        {index === slides.length - 1 ? (
          <Button title="Get started" onPress={() => router.replace('/(auth)/signup')} />
        ) : (
          <Button title="Next" onPress={() => setIndex((value) => value + 1)} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  brand: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 18 },
  skip: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 15 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 8 },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 32, textAlign: 'center', letterSpacing: -0.6 },
  sub: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  footer: { gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surface2 },
  dotActive: { backgroundColor: colors.accentMid, width: 24 },
});
