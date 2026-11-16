import 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
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
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/UI/Toast';
import BrandMark from '@/components/BrandMark';
import { colors, fonts } from '@/constants/theme';
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured } from '@/constants/config';
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
    const guestAllowed = root === 'splash' || root === '(onboarding)' || root === '(auth)' || root === 'profile' || root === 'legal';

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

function MissingConfig() {
  return (
    <View style={s.boot}>
      <BrandMark size={84} />
      <Text style={s.title}>Add your Clerk key</Text>
      <Text style={s.body}>
        Copy .env.example to .env and set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. FaceTag uses Clerk for sign-in and does not start without it.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!isClerkConfigured()) return <MissingConfig />;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <GestureHandlerRootView style={s.app}>
        <SafeAreaProvider>
          <AuthProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
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
  title: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 24, textAlign: 'center' },
  body: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
