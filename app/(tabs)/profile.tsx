import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Avatar from '@/components/UI/Avatar';
import SkeletonLoader from '@/components/UI/SkeletonLoader';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import { useToast } from '@/components/UI/Toast';
import { useAuth, getStoredUsername, saveUsername } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';
import { getCurrentUserToken } from '@/services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface ProfileData {
  id?: string; username?: string; full_name?: string; bio?: string;
  avatar_url?: string; is_public?: boolean; primary_link_platform?: string;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [stats, setStats] = useState({ scanCount: 0, views: 0, links: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'links' | 'activity'>('links');

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await getCurrentUserToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch stats first
      const statsRes = await axios.get(`${API_URL}/api/users/me/stats`, { headers, timeout: 10000 }).catch(() => null);
      if (statsRes?.data) setStats(statsRes.data);

      // Get stored username
      const storedUsername = await getStoredUsername();
      if (storedUsername) {
        const profileRes = await axios.get(`${API_URL}/api/users/${storedUsername}`, { timeout: 10000 }).catch(() => null);
        if (profileRes?.data) {
          const p = profileRes.data.user || profileRes.data;
          setProfile(p);
          setLinks(profileRes.data.links || profileRes.data.social_links || []);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const openEdit = () => {
    setEditName(profile?.full_name || '');
    setEditBio(profile?.bio || '');
    setEditUsername(profile?.username || '');
    setEditMode(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const token = await getCurrentUserToken();
      await axios.put(
        `${API_URL}/api/users/profile`,
        { fullName: editName, bio: editBio, username: editUsername },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 },
      );
      if (editUsername && editUsername !== profile?.username) {
        await saveUsername(editUsername);
      }
      setEditMode(false);
      showToast('Profile updated!', 'success');
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublic = async (val: boolean) => {
    try {
      const token = await getCurrentUserToken();
      await axios.put(
        `${API_URL}/api/users/profile`,
        { isPublic: val },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setProfile(p => p ? { ...p, is_public: val } : p);
      showToast(val ? 'Profile is now public' : 'Profile is now private', 'info');
    } catch {
      showToast('Could not update privacy', 'error');
    }
  };

  const handleShare = () => {
    Share.share({ message: `Check out my FaceTag profile: facetag://profile/${profile?.username}` });
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'FT';

  // ── Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 16 }]}>
        <StatusBar style="light" />
        <View style={s.skeletons}>
          <SkeletonLoader style={{ height: 86, width: 86, borderRadius: 999 }} />
          <SkeletonLoader style={{ height: 20, width: 160 }} />
          <SkeletonLoader style={{ height: 14, width: 100 }} />
          <SkeletonLoader style={{ height: 60, width: '100%' }} />
        </View>
      </View>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────

  if (editMode) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={s.editContent}>
          <View style={s.editHeader}>
            <Text style={s.editTitle}>Edit Profile</Text>
            <Pressable onPress={() => setEditMode(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <Input label="Name" value={editName} onChangeText={setEditName} />
          <Input label="Username" value={editUsername} onChangeText={v => setEditUsername(v.toLowerCase().replace(/\s/g, ''))} autoCapitalize="none" />
          <Input label="Bio" value={editBio} onChangeText={t => setEditBio(t.slice(0, 120))} multiline />
          <Button title="Save changes" onPress={saveEdit} loading={saving} />
        </ScrollView>
      </View>
    );
  }

  // ── Main ───────────────────────────────────────────────────────

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* Header */}
        <View style={s.header}>
          <Avatar size={86} uri={profile?.avatar_url} initials={initials} showRing ringColor="gradient" />
          <Text style={s.name}>{profile?.full_name || 'FaceTag User'}</Text>
          <Text style={s.handle}>@{profile?.username || 'username'}</Text>
          {profile?.bio ? <Text style={s.bio} numberOfLines={3}>{profile.bio}</Text> : null}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statItem}><Text style={s.statNum}>{stats.scanCount}</Text><Text style={s.statLabel}>Scans</Text></View>
          <View style={s.statItem}><Text style={s.statNum}>{stats.views}</Text><Text style={s.statLabel}>Views</Text></View>
          <View style={s.statItem}><Text style={s.statNum}>{links.length}</Text><Text style={s.statLabel}>Links</Text></View>
        </View>

        {/* Actions */}
        <View style={s.btnRow}>
          <Pressable style={s.smallBtn} onPress={openEdit} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
            <Text style={s.smallBtnText}>Edit profile</Text>
          </Pressable>
          <Pressable style={s.smallBtn} onPress={handleShare} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
            <Ionicons name="share-outline" size={14} color="#fff" />
            <Text style={s.smallBtnText}>Share</Text>
          </Pressable>
        </View>

        {/* Privacy toggle */}
        <View style={s.privacyCard}>
          <Ionicons name={profile?.is_public ? 'lock-open' : 'lock-closed'} size={18} color="#fff" />
          <Text style={s.privacyTitle}>{profile?.is_public ? 'Public' : 'Private'} profile</Text>
          <Switch
            value={profile?.is_public || false}
            onValueChange={togglePublic}
            trackColor={{ true: colors.accentMid, false: colors.surface2 }}
            thumbColor="#fff"
          />
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          <Pressable onPress={() => setTab('links')}>
            <Text style={[s.tabText, tab === 'links' && s.tabActive]}>Links</Text>
          </Pressable>
          <Pressable onPress={() => setTab('activity')}>
            <Text style={[s.tabText, tab === 'activity' && s.tabActive]}>Activity</Text>
          </Pressable>
        </View>

        {tab === 'links' ? (
          links.length === 0 ? (
            <Text style={s.emptyText}>No links yet. Add your socials from settings!</Text>
          ) : (
            links.map((link, i) => (
              <View key={i} style={s.card}>
                <View style={s.cardDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{link.platform}</Text>
                  <Text style={s.cardSub} numberOfLines={1}>{link.url}</Text>
                </View>
              </View>
            ))
          )
        ) : (
          <View style={s.card}>
            <Text style={s.cardTitle}>No activity yet</Text>
            <Text style={s.cardSub}>Your scan events will appear here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, paddingBottom: 96, gap: 14 },
  skeletons: { padding: 16, gap: 16, alignItems: 'center' },
  header: { alignItems: 'center', gap: 6 },
  name: { color: '#fff', fontFamily: fonts.bold, fontSize: 18 },
  handle: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13 },
  bio: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', maxWidth: 280 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNum: { color: '#fff', fontFamily: fonts.semibold, fontSize: 18 },
  statLabel: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 11 },
  btnRow: { flexDirection: 'row', gap: 10 },
  smallBtn: {
    flex: 1, height: 36, borderRadius: 12, backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
  },
  smallBtnText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 13 },
  privacyCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0.5, borderColor: colors.surfaceBorder,
  },
  privacyTitle: { flex: 1, color: '#fff', fontFamily: fonts.regular, fontSize: 14 },
  tabs: { flexDirection: 'row', gap: 16 },
  tabText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15 },
  tabActive: { color: '#fff', fontFamily: fonts.semibold },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderColor: colors.surfaceBorder,
  },
  cardDot: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surface2 },
  cardTitle: { color: '#fff', fontFamily: fonts.regular, fontSize: 14 },
  cardSub: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 12 },
  emptyText: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  editContent: { padding: 16, gap: 14, paddingBottom: 36 },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editTitle: { color: '#fff', fontFamily: fonts.bold, fontSize: 20 },
});
