import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getPostAuthRoute } from '@/services/onboarding';

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const { user, isLoading, getToken } = useAuth();

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });

    if (isLoading) return;

    const timer = setTimeout(async () => {
      if (user) {
        const route = await getPostAuthRoute(getToken);
        router.replace(route as '/enroll' | '/setup' | '/(tabs)/scanner');
      } else {
        router.replace('/(onboarding)');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoading, user, getToken]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[s.center, animatedStyle]}>
        <View style={s.iconDot} />
        <Text style={s.logo}>FaceTag</Text>
        <Text style={s.tagline}>Your face. Your links.</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#E1306C',
  },
  logo: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 38,
  },
  tagline: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.regular,
    fontSize: 15,
  },
});
