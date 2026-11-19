import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import BrandMark from '@/components/BrandMark';
import { colors, fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getPostAuthRoute } from '@/services/onboarding';

export default function SplashScreen() {
  const opacity = useSharedValue(0);
  const rise = useSharedValue(12);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    rise.value = withTiming(0, { duration: 700 });
    if (isLoading) return undefined;
    const timer = setTimeout(async () => {
      if (user) {
        const route = await getPostAuthRoute();
        router.replace(route as '/enroll');
      } else {
        router.replace('/(onboarding)');
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, [isLoading, user, opacity, rise]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }],
  }));

  return (
    <View style={s.root}>
      <Animated.View style={[s.center, animated]}>
        <BrandMark size={96} />
        <Text style={s.logo}>FaceTag</Text>
        <Text style={s.tagline}>Your face is the link.</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 12 },
  logo: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 40, letterSpacing: -0.8, marginTop: 8 },
  tagline: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 16 },
});
