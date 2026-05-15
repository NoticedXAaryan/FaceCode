import { type ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Avatar from '@/components/UI/Avatar';
import Button from '@/components/UI/Button';
import { useToast } from '@/components/UI/Toast';
import { useAuth, getStoredUsername } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Row ────────────────────────────────────────────────────────────────────────

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
    <Pressable
      style={s.row}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: false }}
    >
      <View style={[s.iconCircle, danger && { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.danger : colors.textSecondary} />
      </View>
      <Text style={[s.rowLabel, danger && s.rowDanger]}>{label}</Text>
      {right || <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
    </Pressable>
  );
}

// ─── Settings ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, getToken } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [appear, setAppear] = useState(true);
  const [pub, setPub] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await getStoredUsername();
      if (stored) setUsername(stored);
      // Try to load profile info
      try {
        const token = await getToken();
        if (stored) {
          const { data } = await axios.get(`${API_URL}/api/users/${stored}`, { timeout: 8000 });
          const p = data.user || data;
          setFullName(p.full_name || '');
          setAppear(p.is_public ?? true);
          setPub(p.is_public ?? true);
        }
      } catch {}
    })();
  }, []);

  const updatePrivacy = async (key: string, val: boolean) => {
    try {
      const token = await getToken();
      await axios.put(
        `${API_URL}/api/users/profile`,
        { isPublic: val },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast(val ? 'Profile is now public' : 'Profile is now private', 'info');
    } catch {
      showToast('Could not update setting', 'error');
    }
  };

  const handleToggleAppear = (val: boolean) => {
    setAppear(val);
    setPub(val);
    updatePrivacy('is_public', val);
  };

  const handleTogglePublic = (val: boolean) => {
    setPub(val);
    setAppear(val);
    updatePrivacy('is_public', val);
  };

  const handleChangePassword = () => {
    // Clerk handles password management — open Clerk's account portal or show info
    Alert.alert(
      'Change Password',
      'Password management is handled by your account provider. Please use the forgot password option on the login screen.',
      [{ text: 'OK' }],
    );
  };

  const handleDeleteFace = () => {
    Alert.alert('Remove face data', "Are you sure? You won't appear in face scans.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            await axios.delete(`${API_URL}/api/users/face`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            showToast('Face data removed', 'success');
          } catch {
            showToast('Could not delete face data', 'error');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'This action is permanent and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'I understand, delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Are you absolutely sure?', 'All your data will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete forever',
              style: 'destructive',
              onPress: async () => {
                try {
                  const token = await getToken();
                  await axios.delete(`${API_URL}/api/users/account`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  await signOut();
                  router.replace('/(auth)/login');
                } catch {
                  showToast('Could not delete account', 'error');
                }
              },
            },
          ]);
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch {
      showToast('Could not sign out', 'error');
    }
  };

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'FT';

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Settings</Text>

        {/* User card */}
        <Pressable
          style={s.userCard}
          onPress={() => router.push('/(tabs)/profile')}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <Avatar size={48} initials={initials} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.userName}>{fullName || 'FaceTag User'}</Text>
            <Text style={s.userEmail}>{user?.email || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>

        {/* Privacy */}
        <Text style={s.sectionLabel}>PRIVACY</Text>
        <Row
          icon="eye-outline"
          label="Appear in face scans"
          right={
            <Switch
              value={appear}
              onValueChange={handleToggleAppear}
              trackColor={{ true: colors.accentMid, false: colors.surface2 }}
              thumbColor="#fff"
            />
          }
        />
        <Row
          icon="globe-outline"
          label="Public profile page"
          right={
            <Switch
              value={pub}
              onValueChange={handleTogglePublic}
              trackColor={{ true: colors.accentMid, false: colors.surface2 }}
              thumbColor="#fff"
            />
          }
        />

        {/* Face */}
        <Text style={s.sectionLabel}>FACE</Text>
        <Row icon="scan-outline" label="Re-enroll face" onPress={() => router.push('/enroll')} />
        <Row icon="trash-outline" label="Remove face data" danger onPress={handleDeleteFace} />

        {/* Account */}
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <Row icon="key-outline" label="Change password" onPress={handleChangePassword} />
        <Row icon="download-outline" label="Export my data" onPress={() => showToast('Coming soon!', 'info')} />
        <Row icon="person-remove-outline" label="Delete account" danger onPress={handleDeleteAccount} />

        {/* About */}
        <Text style={s.sectionLabel}>ABOUT</Text>
        <Row icon="information-circle-outline" label="Version" right={<Text style={s.versionText}>1.0.0</Text>} />
        <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => Linking.openURL('https://facetag.app/privacy')} />
        <Row icon="document-text-outline" label="Terms of Service" onPress={() => Linking.openURL('https://facetag.app/terms')} />

        {/* Sign out */}
        <View style={s.signOutWrap}>
          <Pressable
            style={s.signOutBtn}
            onPress={handleSignOut}
            android_ripple={{ color: 'rgba(239,68,68,0.2)' }}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={s.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, gap: 6, paddingBottom: 36 },
  title: { color: '#fff', fontFamily: fonts.bold, fontSize: 20, marginBottom: 8 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 16, padding: 14, gap: 12, marginBottom: 8,
    borderWidth: 0.5, borderColor: colors.surfaceBorder,
  },
  userName: { color: '#fff', fontFamily: fonts.semibold, fontSize: 15 },
  userEmail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  sectionLabel: {
    color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 12,
    letterSpacing: 1, marginTop: 12, marginBottom: 4,
  },
  row: {
    height: 52, borderRadius: 12, backgroundColor: colors.surface,
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0.5, borderColor: colors.surfaceBorder,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, color: '#fff', fontFamily: fonts.regular, fontSize: 15 },
  rowDanger: { color: colors.danger },
  versionText: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 13 },
  signOutWrap: { marginTop: 20 },
  signOutBtn: {
    height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.danger,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  signOutText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 15 },
});
