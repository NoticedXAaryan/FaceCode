import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Input from '@/components/UI/Input';
import Button from '@/components/UI/Button';
import Avatar from '@/components/UI/Avatar';
import { useAuth, saveUsername } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://face-code-pink.vercel.app';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { user, getToken } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const emailPrefix = user?.email?.split('@')[0]?.toLowerCase()?.replace(/[^a-z0-9_]/g, '_') || '';
    setUsername(emailPrefix);
    if (user?.fullName) setDisplayName(user.fullName);
  }, [user?.email, user?.fullName]);

  const checkUsername = useCallback(
    (value: string) => {
      const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
      setUsername(clean);
      setUsernameStatus('idle');

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (clean.length < 3) return;

      setUsernameStatus('checking');
      debounceRef.current = setTimeout(async () => {
        try {
          const token = await getToken();
          const { data } = await axios.get(`${API_URL}/api/users/${clean}`, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: (status) => status === 200 || status === 404,
          });

          if (!data?.user && !data?.username) {
            setUsernameStatus('available');
            return;
          }

          const ownerId = data.user?.id ?? data.id;
          if (ownerId && ownerId !== user?.id) {
            setUsernameStatus('taken');
          } else {
            setUsernameStatus('available');
          }
        } catch {
          setUsernameStatus('idle');
        }
      }, 600);
    },
    [user?.id, getToken],
  );

  const handleSubmit = async () => {
    setFormError('');

    if (!displayName.trim()) {
      setFormError('Please enter your name');
      return;
    }

    if (!username.trim() || username.trim().length < 3) {
      setFormError('Pick a username (3+ characters)');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(username.trim())) {
      setFormError('Username: letters, numbers, underscores only');
      return;
    }

    if (usernameStatus === 'taken') {
      setFormError('That username is taken');
      return;
    }

    const links = linkUrl.trim()
      ? [{ platform: 'website', url: linkUrl.trim() }]
      : [];

    setSaving(true);
    try {
      const token = await getToken();

      await axios.put(
        `${API_URL}/api/users/profile`,
        {
          fullName: displayName.trim(),
          username: username.trim(),
          bio: '',
          isPublic,
          primaryLinkPlatform: links.length ? 'website' : null,
          links,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await saveUsername(username.trim());
      router.replace('/(tabs)/scanner');
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Could not save profile';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const initials = displayName
    ? displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'FT';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.progressBar}>
          <LinearGradient
            colors={[colors.accentFrom, colors.accentTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.progressFill, { width: '100%' }]}
          />
        </View>
        <Text style={s.stepText}>Almost done</Text>
        <Text style={s.heading}>Quick profile</Text>
        <Text style={s.subheading}>Just the basics — you can add more later in settings.</Text>

        <View style={s.avatarCenter}>
          <Avatar size={72} initials={initials} showRing ringColor="gradient" />
        </View>

        <Input label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="How should people see you?" />

        <View>
          <Input
            label="Username"
            value={username}
            onChangeText={checkUsername}
            autoCapitalize="none"
            placeholder="facetag.me/you"
          />
          {usernameStatus === 'checking' && (
            <View style={s.usernameStatus}>
              <ActivityIndicator size="small" color={colors.textTertiary} />
            </View>
          )}
          {usernameStatus === 'available' && (
            <Text style={s.usernameAvailable}>Available</Text>
          )}
          {usernameStatus === 'taken' && (
            <Text style={s.usernameTaken}>Username taken</Text>
          )}
        </View>

        <Input
          label="Link (optional)"
          value={linkUrl}
          onChangeText={setLinkUrl}
          placeholder="Instagram, LinkedIn, or any URL"
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={s.privacyCard}>
          <View style={s.privacyRow}>
            <View style={s.privacyInfo}>
              <Text style={s.privacyTitle}>Public profile</Text>
              <Text style={s.privacyDesc}>Let others find you when they scan your face</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ true: colors.accentMid, false: colors.surface2 }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={[s.floatingBtn, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Get started" onPress={handleSubmit} loading={saving} disabled={saving} />
        {formError ? <Text style={s.formError}>{formError}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 36 },
  progressBar: {
    width: '100%', height: 4, backgroundColor: colors.surface2, borderRadius: 999, overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 999 },
  stepText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  heading: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 24 },
  subheading: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, marginBottom: 4 },
  avatarCenter: { alignItems: 'center', paddingVertical: 8 },
  privacyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    marginTop: 4,
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  privacyInfo: { flex: 1, gap: 4 },
  privacyTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15 },
  privacyDesc: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  formError: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  floatingBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderTopWidth: 0.5,
    borderTopColor: colors.surfaceBorder,
    paddingTop: 12,
  },
  usernameStatus: { position: 'absolute', right: 16, top: 18 },
  usernameAvailable: {
    color: colors.success, fontFamily: fonts.regular, fontSize: 11, paddingLeft: 4, marginTop: 2,
  },
  usernameTaken: {
    color: colors.danger, fontFamily: fonts.regular, fontSize: 11, paddingLeft: 4, marginTop: 2,
  },
});
