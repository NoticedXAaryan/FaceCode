import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/UI/Button';
import { colors, fonts } from '@/constants/theme';

const slides = [
  { icon: '📸', title: 'Scan any face', subtitle: 'Point your camera at anyone with FaceTag' },
  { icon: '🔗', title: 'Instant connection', subtitle: 'See their Instagram, LinkedIn, WhatsApp in seconds' },
  { icon: '🔒', title: 'You control it', subtitle: 'Choose exactly who can find you' },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const current = slides[index];

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.top}>
        <Text />
        <Text style={s.skip} onPress={() => router.replace('/(auth)/login')}>
          Skip
        </Text>
      </View>

      <View style={s.slide}>
        <View style={s.circle}>
          <Text style={s.icon}>{current.icon}</Text>
        </View>
        <Text style={s.title}>{current.title}</Text>
        <Text style={s.sub}>{current.subtitle}</Text>
      </View>

      <View style={s.footer}>
        <View style={s.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>
        {index === slides.length - 1 ? (
          <Button title="Get started" onPress={() => router.replace('/(auth)/login')} />
        ) : (
          <Button title="Next" onPress={() => setIndex((v) => v + 1)} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  skip: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 12 },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  icon: { fontSize: 48 },
  title: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 28, textAlign: 'center' },
  sub: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 16, textAlign: 'center' },
  footer: { gap: 20, paddingBottom: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surface2 },
  dotActive: { backgroundColor: colors.accentMid, width: 24 },
});
