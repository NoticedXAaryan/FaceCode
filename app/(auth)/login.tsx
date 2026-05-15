import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)/scanner');
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = () => {
    router.push('/(auth)/signup');
  };

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={s.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <Text style={s.logoSmall}>FaceTag</Text>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.title}>Welcome back</Text>

          <TextInput
            id="login-email-input"
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <TextInput
            id="login-password-input"
            style={s.input}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable id="login-submit-button" onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={[colors.accentFrom, colors.accentTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.button}
            >
              <Text style={s.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
            </LinearGradient>
          </Pressable>

          {error ? <Text style={s.error}>{error}</Text> : null}
        </View>

        {/* Bottom link */}
        <Text style={s.switchText}>
          Don't have an account?{' '}
          <Text style={s.switchLink} onPress={handleSignup}>
            Sign up
          </Text>
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoSmall: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 20,
    textAlign: 'center',
    marginTop: 20,
  },
  form: {
    gap: 14,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 28,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  button: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  switchText: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  switchLink: {
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
});
