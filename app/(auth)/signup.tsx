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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, verifySignUpEmail } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSignup = async () => {
    if (!username) {
      setError('Username is required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await signUp(email, password, username, fullName);
      if (result.needsVerification) {
        setPendingVerification(true);
      } else {
        router.replace('/enroll');
      }
    } catch (e: any) {
      setError(e.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      await verifySignUpEmail(code);
      router.replace('/enroll');
    } catch (e: any) {
      setError(e.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verification step ───────────────────────────────────────────

  if (pendingVerification) {
    return (
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Text style={s.logoSmall}>FaceTag</Text>
          <View style={s.form}>
            <Text style={s.title}>Verify your email</Text>
            <Text style={s.subtitle}>We sent a verification code to {email}</Text>
            <TextInput
              style={s.input}
              placeholder="Verification code"
              placeholderTextColor={colors.textTertiary}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoFocus
            />
            <Pressable onPress={handleVerify} disabled={loading}>
              <LinearGradient
                colors={[colors.accentFrom, colors.accentTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.button}
              >
                <Text style={s.buttonText}>{loading ? 'Verifying…' : 'Verify & continue'}</Text>
              </LinearGradient>
            </Pressable>
            {error ? <Text style={s.error}>{error}</Text> : null}
          </View>
          <Text style={s.switchText}>
            <Text style={s.switchLink} onPress={() => setPendingVerification(false)}>
              ← Back
            </Text>
          </Text>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Main signup form ────────────────────────────────────────────

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={s.logoSmall}>FaceTag</Text>
        <View style={s.form}>
          <Text style={s.title}>Create account</Text>
          <TextInput style={s.input} placeholder="Full name" placeholderTextColor={colors.textTertiary} value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          <TextInput style={s.input} placeholder="Username" placeholderTextColor={colors.textTertiary} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textTertiary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.input} placeholder="Password" placeholderTextColor={colors.textTertiary} value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable onPress={handleSignup} disabled={loading}>
            <LinearGradient colors={[colors.accentFrom, colors.accentTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.button}>
              <Text style={s.buttonText}>{loading ? 'Creating…' : 'Sign up'}</Text>
            </LinearGradient>
          </Pressable>
          {error ? <Text style={s.error}>{error}</Text> : null}
        </View>
        <Text style={s.switchText}>Already have an account?{' '}<Text style={s.switchLink} onPress={() => router.push('/(auth)/login')}>Sign in</Text></Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  logoSmall: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 20, textAlign: 'center', marginTop: 20 },
  form: { gap: 14 },
  title: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 28, marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, marginBottom: 6 },
  input: { backgroundColor: colors.surface2, borderRadius: 12, height: 52, paddingHorizontal: 16, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, borderWidth: 1, borderColor: 'transparent' },
  button: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16 },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
  switchText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', marginBottom: 16 },
  switchLink: { color: colors.accent, fontFamily: fonts.semibold },
});
