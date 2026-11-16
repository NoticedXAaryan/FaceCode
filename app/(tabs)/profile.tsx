import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import Avatar from '@/components/UI/Avatar';
import AvatarUpload from '@/components/Profile/AvatarUpload';
import SkeletonLoader from '@/components/UI/SkeletonLoader';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import LinkEditor, { type EditorLink } from '@/components/Profile/LinkEditor';
import { useToast } from '@/components/UI/Toast';
import { saveUsername, useAuth } from '@/hooks/useAuth';
import { colors, fonts } from '@/constants/theme';
import { openableUrl, platformMeta } from '@/constants/platforms';
import api from '@/services/api';

type ProfileData = {
  username?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  is_public?: boolean;
  primary_link_platform?: string;
  links?: EditorLink[];
};

type ActivityEvent = {
  id?: number;
  event_type?: string;
  matched?: boolean;
  platform?: string;
  scanned_at?: string;
  scanner_name?: string;
  scanner_username?: string;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [links, setLinks] = useState<EditorLink[]>([]);
  const [stats, setStats] = useState({ scanCount: 0, views: 0, links: 0 });
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'links' | 'activity'>('links');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editLinks, setEditLinks] = useState<EditorLink[]>([]);
  const [primary, setPrimary] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [meRes, statsRes, activityRes] = await Promise.all([
      api.get('/api/users/me').catch(() => null),
      api.get('/api/users/me/stats').catch(() => null),
      api.get('/api/users/me/activity').catch(() => null),
    ]);
    const me = meRes?.data;
    if (me?.profile) {
      setProfile(me.profile);
      setLinks(me.profile.links || []);
      if (me.profile.username) await saveUsername(me.profile.username);
    }
    if (statsRes?.data) {
      setStats({
        scanCount: statsRes.data.scanCount ?? 0,
        views: statsRes.data.views ?? 0,
        links: statsRes.data.links ?? me?.profile?.links?.length ?? 0,
      });
    }
    setActivity(activityRes?.data?.events || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const openEdit = () => {
    setEditName(profile?.full_name || user?.fullName || '');
    setEditBio(profile?.bio || '');
    setEditUsername(profile?.username || '');
    setEditLinks(links.map((link) => ({ platform: link.platform, url: link.url })));
    setPrimary(profile?.primary_link_platform || links[0]?.platform || '');
    setAvatarUri(profile?.avatar_url);
    setEditMode(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      if (avatarUri && avatarUri !== profile?.avatar_url && !avatarUri.startsWith('data:')) {
        const imageBase64 = await FileSystem.readAsStringAsync(avatarUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const uploaded = await api.post('/api/users/avatar', { imageBase64 });
        setAvatarUri(uploaded.data.avatarUrl);
      }
      await api.put('/api/users/profile', {
        fullName: editName.trim(),
        bio: editBio.trim(),
        username: editUsername.trim(),
        primaryLinkPlatform: primary || null,
        links: editLinks.filter((link) => link.url.trim()),
      });
      if (editUsername.trim()) await saveUsername(editUsername.trim().toLowerCase());
      setEditMode(false);
      showToast('Profile updated', 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || e.message || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublic = async (value: boolean) => {
    setProfile((current) => (current ? { ...current, is_public: value } : current));
    try {
      await api.put('/api/users/profile', { isPublic: value });
      showToast(value ? 'Profile is now public' : 'Profile is now private', 'info');
    } catch {
      setProfile((current) => (current ? { ...current, is_public: !value } : current));
      showToast('Could not update privacy', 'error');
    }
  };

  const initials = (profile?.full_name || user?.fullName || 'FaceTag')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 24 }]}>
        <StatusBar style="light" />
        <View style={s.skeletons}>
          <SkeletonLoader style={{ height: 86, width: 86, borderRadius: 999 }} />
          <SkeletonLoader style={{ height: 20, width: 160 }} />
          <SkeletonLoader style={{ height: 14, width: 100 }} />
        </View>
      </View>
    );
  }

  if (editMode) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={s.editContent} keyboardShouldPersistTaps="handled">
          <View style={s.editHeader}>
            <Text style={s.editTitle}>Edit profile</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close editor" onPress={() => setEditMode(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <AvatarUpload uri={avatarUri} onChange={setAvatarUri} />
          <Input label="Name" value={editName} onChangeText={setEditName} />
          <Input
            label="Username"
            value={editUsername}
            onChangeText={(value) => setEditUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
            autoCapitalize="none"
          />
          <Input label="Bio" value={editBio} onChangeText={(value) => setEditBio(value.slice(0, 160))} multiline />
          <LinkEditor links={editLinks} primary={primary} onChange={setEditLinks} onPrimary={setPrimary} />
          <Button title="Save changes" onPress={saveEdit} loading={saving} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={s.header}>
          <Avatar size={92} uri={profile?.avatar_url} initials={initials} showRing ringColor="gradient" />
          <Text style={s.name}>{profile?.full_name || user?.fullName || 'FaceTag user'}</Text>
          <Text style={s.handle}>@{profile?.username || 'choose-a-username'}</Text>
          {profile?.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}
        </View>
        <View style={s.statsRow}>
          <Stat value={stats.scanCount} label="Scans" />
          <Stat value={stats.views} label="Views" />
          <Stat value={links.length} label="Links" />
        </View>
        <View style={s.btnRow}>
          <Pressable style={s.smallBtn} accessibilityRole="button" onPress={openEdit}>
            <Text style={s.smallBtnText}>Edit profile</Text>
          </Pressable>
          <Pressable
            style={s.smallBtn}
            accessibilityRole="button"
            onPress={() =>
              Share.share({
                message: profile?.username
                  ? `Find me on FaceTag: facetag://profile/${profile.username}`
                  : 'Find me on FaceTag',
              })
            }
          >
            <Ionicons name="share-outline" size={15} color="#fff" />
            <Text style={s.smallBtnText}>Share</Text>
          </Pressable>
        </View>
        <View style={s.privacyCard}>
          <Ionicons name={profile?.is_public ? 'eye-outline' : 'eye-off-outline'} size={18} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={s.privacyTitle}>{profile?.is_public ? 'Public profile' : 'Private profile'}</Text>
            <Text style={s.privacyHint}>{profile?.is_public ? 'People can open your card from a scan.' : 'Scans will not reveal you.'}</Text>
          </View>
          <Switch
            value={Boolean(profile?.is_public)}
            onValueChange={togglePublic}
            trackColor={{ true: colors.accentMid, false: colors.surface2 }}
            thumbColor="#fff"
          />
        </View>
        <View style={s.tabs}>
          <Pressable onPress={() => setTab('links')}><Text style={[s.tabText, tab === 'links' && s.tabActive]}>Links</Text></Pressable>
          <Pressable onPress={() => setTab('activity')}><Text style={[s.tabText, tab === 'activity' && s.tabActive]}>Activity</Text></Pressable>
        </View>
        {tab === 'links' ? (
          links.length === 0 ? (
            <Text style={s.emptyText}>No links yet. Add Instagram, LinkedIn, or a site from Edit profile.</Text>
          ) : (
            links.map((link) => {
              const meta = platformMeta(link.platform);
              return (
                <Pressable key={`${link.platform}-${link.url}`} style={s.card} onPress={() => Linking.openURL(openableUrl(link.url))}>
                  <View style={[s.cardIcon, { backgroundColor: meta.color }]}>
                    <Ionicons name={meta.icon as any} size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{meta.label}</Text>
                    <Text style={s.cardSub} numberOfLines={1}>{link.url}</Text>
                  </View>
                </Pressable>
              );
            })
          )
        ) : activity.length === 0 ? (
          <Text style={s.emptyText}>When someone scans you, views your card, or opens a link, it shows up here.</Text>
        ) : (
          activity.map((event, index) => (
            <View key={event.id || index} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{activityTitle(event)}</Text>
                <Text style={s.cardSub}>{event.scanned_at ? new Date(event.scanned_at).toLocaleString() : ''}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statNum}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function activityTitle(event: ActivityEvent) {
  if (event.event_type === 'view') return 'Someone viewed your card';
  if (event.event_type === 'click') return `Opened your ${event.platform || 'link'}`;
  const who = event.scanner_name || (event.scanner_username ? `@${event.scanner_username}` : 'Someone');
  return `${who} scanned you`;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, paddingBottom: 96, gap: 14 },
  skeletons: { padding: 16, gap: 16, alignItems: 'center' },
  header: { alignItems: 'center', gap: 6 },
  name: { color: '#fff', fontFamily: fonts.bold, fontSize: 22 },
  handle: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  bio: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  statItem: { alignItems: 'center', gap: 2 },
  statNum: { color: '#fff', fontFamily: fonts.semibold, fontSize: 18 },
  statLabel: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 11 },
  btnRow: { flexDirection: 'row', gap: 10 },
  smallBtn: {
    flex: 1, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
  },
  smallBtnText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 13 },
  privacyCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderColor: colors.surfaceBorder,
  },
  privacyTitle: { color: '#fff', fontFamily: fonts.semibold, fontSize: 14 },
  privacyHint: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 18, marginTop: 4 },
  tabText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15 },
  tabActive: { color: '#fff', fontFamily: fonts.semibold },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0.5, borderColor: colors.surfaceBorder,
  },
  cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontFamily: fonts.medium, fontSize: 14 },
  cardSub: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', paddingVertical: 20, lineHeight: 20 },
  editContent: { padding: 16, gap: 14, paddingBottom: 48 },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editTitle: { color: '#fff', fontFamily: fonts.bold, fontSize: 22 },
});
