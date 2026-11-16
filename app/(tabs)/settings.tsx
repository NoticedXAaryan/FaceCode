import { type ReactNode, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/UI/Avatar';
import { useToast } from '@/components/UI/Toast';
import { getStoredUsername, useAuth } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';
import api from '@/services/api';

function Row({
  icon,
  label,
  danger,
  right,
  onPress,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable style={s.row} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={[s.iconCircle, danger && { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.danger : colors.textSecondary} />
      </View>
      <Text style={[s.rowLabel, danger && s.rowDanger]}>{label}</Text>
      {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, changePassword } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [hasFace, setHasFace] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getStoredUsername();
      if (stored) setUsername(stored);
      try {
        const { data } = await api.get('/api/users/me');
        if (data.username) setUsername(data.username);
        setHasFace(Boolean(data.hasFace));
        if (data.profile) {
          setFullName(data.profile.full_name || data.fullName || '');
          setIsPublic(data.profile.is_public ?? data.isPublic ?? true);
        }
      } catch {
        // Settings still work offline for sign-out.
      }
    })();
  }, []);

  const handleTogglePublic = async (value: boolean) => {
    setIsPublic(value);
    try {
      await api.put('/api/users/profile', { isPublic: value });
      showToast(value ? 'Profile is now public' : 'Profile is now private', 'info');
    } catch {
      setIsPublic(!value);
      showToast('Could not update setting', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (nextPassword.length < 8) {
      showToast('Use at least 8 characters', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, nextPassword);
      setPasswordOpen(false);
      setCurrentPassword('');
      setNextPassword('');
      showToast('Password updated', 'success');
    } catch (e: any) {
      showToast(e.message || 'Could not change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteFace = () => {
    Alert.alert('Remove face data', 'You will no longer appear when someone scans you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/api/users/face');
            setHasFace(false);
            showToast('Face data removed', 'success');
          } catch {
            showToast('Could not delete face data', 'error');
          }
        },
      },
    ]);
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/api/users/me/export');
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch {
      showToast('Could not export your data', 'error');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'This removes your profile, links, and face signature.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete forever',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/api/users/account');
            await signOut();
            router.replace('/(auth)/login');
          } catch {
            showToast('Could not delete account', 'error');
          }
        },
      },
    ]);
  };

  const initials = fullName
    ? fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'FT';

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Settings</Text>
        <Pressable style={s.userCard} onPress={() => router.push('/(tabs)/profile')}>
          <Avatar size={48} initials={initials} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.userName}>{fullName || 'FaceTag user'}</Text>
            <Text style={s.userEmail}>{username ? `@${username}` : user?.email || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>

        <Text style={s.sectionLabel}>PRIVACY</Text>
        <Row
          icon="eye-outline"
          label="Public profile"
          right={<Switch value={isPublic} onValueChange={handleTogglePublic} trackColor={{ true: colors.accentMid, false: colors.surface2 }} thumbColor="#fff" />}
        />

        <Text style={s.sectionLabel}>FACE</Text>
        <Row icon="scan-outline" label={hasFace ? 'Face enrolled' : 'Face not enrolled'} right={<Text style={s.versionText}>{hasFace ? 'On' : 'Off'}</Text>} />
        <Row icon="refresh-outline" label="Re-enroll face" onPress={() => router.push('/enroll?mode=update')} />
        <Row icon="trash-outline" label="Remove face data" danger onPress={handleDeleteFace} />

        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <Row icon="key-outline" label="Change password" onPress={() => setPasswordOpen((open) => !open)} />
        {passwordOpen ? (
          <View style={s.passwordCard}>
            <TextInput style={s.input} placeholder="Current password" placeholderTextColor={colors.textTertiary} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
            <TextInput style={s.input} placeholder="New password" placeholderTextColor={colors.textTertiary} secureTextEntry value={nextPassword} onChangeText={setNextPassword} />
            <Pressable style={s.savePassword} onPress={handleChangePassword} disabled={savingPassword}>
              <Text style={s.savePasswordText}>{savingPassword ? 'Saving…' : 'Update password'}</Text>
            </Pressable>
          </View>
        ) : null}
        <Row icon="download-outline" label="Export my data" onPress={handleExport} />
        <Row icon="person-remove-outline" label="Delete account" danger onPress={handleDeleteAccount} />

        <Text style={s.sectionLabel}>ABOUT</Text>
        <Row icon="information-circle-outline" label="Version" right={<Text style={s.versionText}>1.0.0</Text>} />
        <Row icon="shield-checkmark-outline" label="Privacy" onPress={() => router.push('/legal?doc=privacy')} />
        <Row icon="document-text-outline" label="Terms" onPress={() => router.push('/legal?doc=terms')} />

        <Pressable
          style={s.signOutBtn}
          onPress={async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch {
              showToast('Could not sign out', 'error');
            }
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, gap: 6, paddingBottom: 40 },
  title: { color: '#fff', fontFamily: fonts.bold, fontSize: 28, marginBottom: 8 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 16, padding: 14, gap: 12, marginBottom: 8, borderWidth: 0.5, borderColor: colors.surfaceBorder,
  },
  userName: { color: '#fff', fontFamily: fonts.semibold, fontSize: 15 },
  userEmail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  sectionLabel: { color: colors.textTertiary, fontFamily: fonts.medium, fontSize: 12, letterSpacing: 1, marginTop: 14, marginBottom: 4 },
  row: {
    minHeight: 52, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderColor: colors.surfaceBorder,
  },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, color: '#fff', fontFamily: fonts.regular, fontSize: 15 },
  rowDanger: { color: colors.danger },
  versionText: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 13 },
  passwordCard: { gap: 8, marginVertical: 4 },
  input: { height: 48, borderRadius: 12, backgroundColor: colors.surface2, color: '#fff', paddingHorizontal: 14, fontFamily: fonts.regular },
  savePassword: { height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  savePasswordText: { color: '#fff', fontFamily: fonts.semibold },
  signOutBtn: {
    marginTop: 22, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.danger,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  signOutText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 15 },
});
