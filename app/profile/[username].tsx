import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/UI/Avatar';
import Button from '@/components/UI/Button';
import SkeletonLoader from '@/components/UI/SkeletonLoader';
import { colors, fonts } from '@/constants/theme';
import api from '@/services/api';

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  linkedin: '💼',
  whatsapp: '💬',
  twitter: '🐦',
  x: '🐦',
  website: '🌐',
};

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    api
      .get(`/api/users/${username}`)
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch(() => setError('Profile not found or private'))
      .finally(() => setLoading(false));
  }, [username]);

  const openLink = (url: string) => {
    if (url && !url.startsWith('http')) url = 'https://' + url;
    if (url) Linking.openURL(url);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${data?.full_name || username}'s profile on FaceTag! https://facetag.app/${username}`,
        url: `https://facetag.app/${username}`,
      });
    } catch {}
  };

  // ── Loading ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.skeletonWrap}>
          <SkeletonLoader style={{ height: 64, width: 64, borderRadius: 999 }} />
          <SkeletonLoader style={{ height: 22, width: 160 }} />
          <SkeletonLoader style={{ height: 14, width: 100 }} />
          <SkeletonLoader style={{ height: 120, width: '100%' }} />
        </View>
      </View>
    );
  }

  // ── Error / not found ──────────────────────────────────────────────

  if (error || !data) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={s.navBar}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={s.errorBox}>
          <Ionicons name="lock-closed" size={40} color={colors.textTertiary} />
          <Text style={s.errorTitle}>Profile not found</Text>
          <Text style={s.errorSub}>{error || 'This profile may be private or deleted.'}</Text>
          <Button
            title="Download FaceTag"
            onPress={() => Linking.openURL('https://facetag.app')}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  // ── Profile card ──────────────────────────────────────────────────

  const linksList = data.links || data.social_links || [];
  const primaryPlatform = data.primary_link_platform || linksList[0]?.platform || '';
  const primaryLink = linksList.find((l: any) => l.platform === primaryPlatform) || linksList[0];

  const initials = data.full_name
    ? data.full_name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'FT';

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Nav bar */}
      <View style={s.navBar}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Pressable onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <Avatar
            size={80}
            uri={data.avatar_url}
            initials={initials}
            showRing
            ringColor="gradient"
          />
          <Text style={s.name}>{data.full_name}</Text>
          <Text style={s.handle}>@{data.username}</Text>
          {data.bio ? (
            <Text style={s.bio} numberOfLines={3}>
              {data.bio}
            </Text>
          ) : null}
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Links */}
        <View style={s.linksList}>
          {linksList.map((link: any, idx: number) => {
            const pKey = (link.platform || '').toLowerCase();
            return (
              <Pressable key={idx} style={s.linkRow} onPress={() => openLink(link.url)}>
                <View style={s.platformIcon}>
                  <Text style={s.platformEmoji}>{PLATFORM_ICONS[pKey] || '🔗'}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.platformName}>{link.platform}</Text>
                  <Text style={s.linkUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            );
          })}
        </View>

        {/* Primary CTA */}
        {primaryLink ? (
          <Pressable onPress={() => openLink(primaryLink.url)}>
            <LinearGradient
              colors={[colors.accentFrom, colors.accentTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.ctaButton}
            >
              <Text style={s.ctaText}>Open {primaryLink.platform} →</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  skeletonWrap: { padding: 20, gap: 16, alignItems: 'center' },
  header: { alignItems: 'center', gap: 6 },
  name: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 24 },
  handle: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  bio: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  divider: { height: 1, backgroundColor: colors.surfaceBorder },
  linksList: { gap: 8 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformEmoji: { fontSize: 18 },
  platformName: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14 },
  linkUrl: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 12 },
  ctaButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16 },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 24,
  },
  errorTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 20 },
  errorSub: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
});
