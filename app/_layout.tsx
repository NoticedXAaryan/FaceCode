import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
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
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { ClerkProvider } from '@clerk/expo';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/UI/Toast';
import { colors } from '@/constants/theme';
import { getPostAuthRoute } from '@/services/onboarding';

// Prevent the native splash screen from hiding before we're ready
SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

// ─── Clerk token cache using SecureStore ────────────────────────────────────────

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// ─── Inner navigator that can safely call useAuth() ────────────────────────────

function RootNavigator() {
  const { user, isLoading, getToken } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const routedRef = useRef(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hide the native splash screen once fonts + auth are both resolved
  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // Auth-based redirect
  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const root = segments[0];
    const guestAllowed =
      root === 'splash' ||
      root === '(onboarding)' ||
      root === '(auth)' ||
      root === 'profile';

    if (!user) {
      routedRef.current = false;
      if (!guestAllowed) {
        router.replace('/(auth)/login');
      }
      return;
    }

    const onBootstrap =
      root === 'splash' || root === '(onboarding)' || root === '(auth)';

    if (onBootstrap && !routedRef.current) {
      routedRef.current = true;
      getPostAuthRoute(getToken)
        .then((route) => router.replace(route as '/enroll' | '/setup' | '/(tabs)/scanner'))
        .catch(() => router.replace('/(tabs)/scanner'));
    }
  }, [isLoading, user, fontsLoaded, segments, getToken, router]);

  // Loading gate — show a plain black screen with a spinner
  if (!fontsLoaded || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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

// ─── Root layout wraps providers, child does the auth logic ────────────────────

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
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