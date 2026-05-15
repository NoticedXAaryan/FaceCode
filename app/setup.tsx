import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Input from '@/components/UI/Input';
import Button from '@/components/UI/Button';
import Avatar from '@/components/UI/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';
import { getCurrentUserToken } from '@/services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C', icon: 'logo-instagram' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'logo-linkedin' },
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: 'logo-whatsapp' },
  { key: 'x', label: 'X (Twitter)', color: '#FFFFFF', icon: 'logo-twitter' },
  { key: 'website', label: 'Website', color: '#6C5CE7', icon: 'globe-outline' },
] as const;

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [primary, setPrimary] = useState('instagram');
  const [links, setLinks] = useState<Record<string, string>>({
    instagram: '', linkedin: '', whatsapp: '', x: '', website: '',
  });
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const emailPrefix = user?.email?.split('@')[0]?.toLowerCase()?.replace(/[^a-z0-9_]/g, '_') || '';
    setUsername(emailPrefix);
  }, [user?.email]);

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
          const token = await getCurrentUserToken();
          const { data } = await axios.get(`${API_URL}/api/users/${clean}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (data?.user?.id !== user?.id && data?.id !== user?.id) {
            setUsernameStatus('taken');
          } else {
            setUsernameStatus('available');
          }
        } catch {
          setUsernameStatus('available');
        }
      }, 600);
    },
    [user?.id],
  );

  const handleSubmit = async () => {
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Name is required');
      return;
    }

    if (!username.trim() || username.trim().length < 3) {
      setFormError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(username.trim())) {
      setFormError('Username: letters, numbers, underscores only');
      return;
    }

    if (usernameStatus === 'taken') {
      setFormError('Username is taken');
      return;
    }

    const formattedLinks = Object.entries(links)
      .filter(([, url]) => url.trim() !== '')
      .map(([platform, url]) => ({ platform, url: url.trim() }));

    setSaving(true);
    try {
      const token = await getCurrentUserToken();

      await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/profile`,
        {
          fullName: fullName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          isPublic,
          primaryLinkPlatform: primary,
          links: formattedLinks,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      await SecureStore.setItemAsync('username', username.trim());
      router.replace('/(tabs)/scanner');
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Could not save profile';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
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
        <Text style={s.stepText}>Step 2 of 2 - Set up Profile</Text>

        <View style={s.avatarCenter}>
          <Avatar size={72} initials={initials} showRing ringColor="gradient" />
        </View>

        <Input label="Full name" value={fullName} onChangeText={setFullName} />

        <View>
          <Input
            label="Username"
            value={username}
            onChangeText={checkUsername}
            autoCapitalize="none"
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
          label="Bio"
          value={bio}
          onChangeText={(t) => setBio(t.slice(0, 120))}
          multiline
        />

        <Text style={s.sectionTitle}>Your links</Text>
        {PLATFORMS.map((p) => {
          const isPrimary = primary === p.key;
          return (
            <View key={p.key} style={[s.linkCard, { borderLeftColor: p.color }]}> 
              <View style={s.linkHeader}>
                <Ionicons name={p.icon as any} size={20} color={p.color} />
                <Text style={s.platformName}>{p.label}</Text>
                <Pressable onPress={() => setPrimary(p.key)}>
                  <Text style={[s.starText, isPrimary && s.starActive]}>
                    {isPrimary ? 'Primary' : 'Set primary'}
                  </Text>
                </Pressable>
              </View>
              <Input
                placeholder={`${p.label} URL`}
                value={links[p.key]}
                onChangeText={(v) => setLinks((prev) => ({ ...prev, [p.key]: v }))}
                autoCapitalize="none"
              />
            </View>
          );
        })}

        <LinearGradient
          colors={
            isPublic
              ? ['rgba(108,92,231,0.15)', 'rgba(131,58,180,0.15)']
              : [colors.surface, colors.surface]
          }
          style={s.privacyCard}
        >
          <View style={s.privacyRow}>
            <Ionicons
              name={isPublic ? 'lock-open' : 'lock-closed'}
              size={22}
              color={isPublic ? colors.accent : colors.textSecondary}
            />
            <View style={s.privacyInfo}>
              <Text style={s.privacyTitle}>Make profile public</Text>
              <Text style={s.privacyDesc}>Anyone with FaceTag can scan your face</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ true: colors.accentMid, false: colors.surface2 }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </LinearGradient>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={[s.floatingBtn, { paddingBottom: insets.bottom + 16 }]}> 
        <Button title="Finish setup" onPress={handleSubmit} loading={saving} disabled={saving} />
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
  avatarCenter: { alignItems: 'center', paddingVertical: 8 },
  sectionTitle: {
    color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 18, marginTop: 12,
  },
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderLeftWidth: 3,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
  },
  linkHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  platformName: { flex: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14 },
  starText: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 12 },
  starActive: { color: '#F5A623' },
  privacyCard: { borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: colors.surfaceBorder },
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
