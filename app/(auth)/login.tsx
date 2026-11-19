import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoogleButton from '@/components/Auth/GoogleButton';
import { useAuth } from '@/hooks/useAuth';
import { getPostAuthRoute } from '@/services/onboarding';
import { colors, fonts } from '@/constants/theme';

type Step = 'login' | 'forgot' | 'reset' | 'sent';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, requestPasswordReset, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const finishAuth = async () => {
    const route = await getPostAuthRoute();
    router.replace(route as '/enroll');
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      await finishAuth();
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await finishAuth();
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendReset = async () => {
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setStep('sent');
    } catch (e: any) {
      setError(e.message || 'Could not send a reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      await finishAuth();
    } catch (e: any) {
      setError(e.message || 'Could not reset the password.');
    } finally {
      setLoading(false);
    }
  };

  const title =
    step === 'login'
      ? 'Welcome back'
      : step === 'forgot'
        ? 'Reset password'
        : step === 'sent'
          ? 'Check your email'
          : 'Choose a new password';
  const subtitle =
    step === 'forgot'
      ? 'We will email you a reset link.'
      : step === 'sent'
        ? `If an account exists for ${email}, a reset link is on the way. Set RESEND_API_KEY on the server to deliver mail.`
        : step === 'reset'
          ? 'Paste the token from your reset email, then choose a new password.'
          : 'Sign in to scan and share your card.';

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={s.logoSmall}>FaceTag</Text>
        <View style={s.form}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
          {step === 'login' ? <GoogleButton onPress={handleGoogle} loading={googleLoading} /> : null}
          {step === 'login' ? (
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>
          ) : null}
          {step === 'login' || step === 'forgot' ? (
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              accessibilityLabel="Email"
            />
          ) : null}
          {step === 'reset' ? (
            <TextInput
              style={s.input}
              placeholder="Reset token"
              placeholderTextColor={colors.textTertiary}
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              accessibilityLabel="Reset token"
            />
          ) : null}
          {step === 'login' || step === 'reset' ? (
            <TextInput
              style={s.input}
              placeholder={step === 'reset' ? 'New password' : 'Password'}
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Password"
            />
          ) : null}
          {step !== 'sent' ? (
            <Pressable
              accessibilityRole="button"
              onPress={step === 'login' ? handleLogin : step === 'forgot' ? handleSendReset : handleReset}
              disabled={loading || googleLoading}
            >
              <LinearGradient colors={[colors.accentFrom, colors.accentTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.button}>
                <Text style={s.buttonText}>
                  {loading
                    ? 'Please wait…'
                    : step === 'login'
                      ? 'Sign in'
                      : step === 'forgot'
                        ? 'Send reset link'
                        : 'Update password'}
                </Text>
              </LinearGradient>
            </Pressable>
          ) : null}
          {error ? <Text style={s.error}>{error}</Text> : null}
          {step === 'login' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError('');
                setStep('forgot');
              }}
            >
              <Text style={s.forgot}>Forgot password?</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError('');
                setStep(step === 'sent' ? 'reset' : 'login');
              }}
            >
              <Text style={s.forgot}>{step === 'sent' ? 'I already have a token' : 'Back to sign in'}</Text>
            </Pressable>
          )}
        </View>
        <Text style={s.switchText}>
          Need an account?{' '}
          <Text style={s.switchLink} onPress={() => router.push('/(auth)/signup')}>
            Sign up
          </Text>
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  logoSmall: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 20, textAlign: 'center', marginTop: 20 },
  form: { gap: 14 },
  title: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 28 },
  subtitle: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, marginTop: -6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.surfaceBorder },
  dividerText: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 13 },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  button: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16 },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
  forgot: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' },
  switchText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', marginBottom: 16 },
  switchLink: { color: colors.accentMid, fontFamily: fonts.semibold },
});
