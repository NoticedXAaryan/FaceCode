import 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/UI/Toast';
import { colors } from '@/constants/theme';
import { getPostAuthRoute } from '@/services/onboarding';

SplashScreen.preventAutoHideAsync().catch(() => {});
WebBrowser.maybeCompleteAuthSession();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const routedRef = useRef(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && !isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, isLoading]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;
    const root = segments[0];
    const guestAllowed =
      root === 'splash' ||
      root === '(onboarding)' ||
      root === '(auth)' ||
      root === 'profile' ||
      root === 'legal';

    if (!user) {
      routedRef.current = false;
      if (!guestAllowed) router.replace('/(auth)/login');
      return;
    }

    if ((root === '(onboarding)' || root === '(auth)') && !routedRef.current) {
      routedRef.current = true;
      getPostAuthRoute()
        .then((route) => router.replace(route as '/enroll'))
        .catch(() => router.replace('/(tabs)/scanner'));
    }
  }, [isLoading, user, fontsLoaded, segments, router]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={s.boot}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={s.app}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
});
