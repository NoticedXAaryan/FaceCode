import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/UI/Button';
import { theme } from '@/constants/theme';

const slides = [
  { icon: '📸', title: 'Scan any face', subtitle: 'Point your camera at anyone with FaceTag' },
  { icon: '🔗', title: 'Instant connection', subtitle: 'See their Instagram, LinkedIn, WhatsApp in seconds' },
  { icon: '🔒', title: 'You control it', subtitle: 'Choose exactly who can find you' },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const current = slides[index];

  const onSwipe = (x: number) => {
    if (x < -40 && index < slides.length - 1) setIndex((v) => v + 1);
    if (x > 40 && index > 0) setIndex((v) => v - 1);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.top}><Text /><Text style={s.skip} onPress={() => router.replace('/(auth)/login')}>Skip</Text></View>
      <PanGestureHandler onEnded={(e) => onSwipe(e.nativeEvent.translationX as number)}>
        <View style={s.slide}>
          <View style={s.circle}><Text style={s.icon}>{current.icon}</Text></View>
          <Text style={s.title}>{current.title}</Text>
          <Text style={s.sub}>{current.subtitle}</Text>
        </View>
      </PanGestureHandler>
      <View style={s.footer}>
        <View style={s.dots}>{slides.map((_, i) => <View key={i} style={[s.dot, i === index && s.dotActive]} />)}</View>
        {index === slides.length - 1 ? <Button title="Get started" onPress={() => router.replace('/(auth)/login')} /> : <Button title="Next" onPress={() => setIndex((v) => v + 1)} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  top: { paddingHorizontal: 24, alignItems: 'flex-end' },
  skip: { color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily, fontSize: 15 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  circle: { width: 240, height: 240, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  icon: { color: theme.colors.accentMid, fontSize: 72 },
  title: { color: theme.colors.textPrimary, fontFamily: theme.typography.display.fontFamily, fontSize: 26 },
  sub: { color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily, fontSize: 15, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.textTertiary },
  dotActive: { width: 18, backgroundColor: theme.colors.textPrimary },
});
