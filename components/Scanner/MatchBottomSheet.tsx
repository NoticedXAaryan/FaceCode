import { useCallback, useMemo, useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '@/components/UI/Avatar';
import { colors, fonts } from '@/constants/theme';
import { openableUrl, platformMeta } from '@/constants/platforms';
import type { MatchResult } from '@/hooks/useFaceScanner';
import api from '@/services/api';

type Props = {
  isVisible: boolean;
  matchData: MatchResult | null;
  onClose: () => void;
};

export default function MatchBottomSheet({ isVisible, matchData, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['58%', '88%'], []);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.65} />,
    [],
  );

  if (!isVisible || !matchData?.user) return null;

  const user = matchData.user;
  const links = matchData.links || [];
  const primary = links.find((link) => link.platform === user.primary_link_platform) || links[0];
  const initials = user.full_name
    ? user.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'FT';
  const score = typeof matchData.score === 'number' ? Math.round(matchData.score * 100) : null;

  const openLink = (platform: string, url: string) => {
    const href = openableUrl(url);
    if (!href) return;
    api.post('/api/events/click', { username: user.username, platform }).catch(() => {});
    Linking.openURL(href);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={s.handle}
      backgroundStyle={s.background}
    >
      <BottomSheetView style={s.content}>
        <View style={s.header}>
          <Avatar size={72} uri={user.avatar_url} initials={initials} showRing ringColor="green" />
          <Text style={s.name}>{user.full_name || user.username}</Text>
          <Text style={s.username}>@{user.username}</Text>
          {score !== null ? <Text style={s.score}>{score}% match</Text> : null}
          {user.bio ? <Text style={s.bio} numberOfLines={2}>{user.bio}</Text> : null}
        </View>
        <View style={s.links}>
          {links.map((link) => {
            const meta = platformMeta(link.platform);
            return (
              <Pressable
                key={`${link.platform}-${link.url}`}
                style={s.linkRow}
                accessibilityRole="link"
                onPress={() => openLink(link.platform, link.url)}
              >
                <View style={[s.icon, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon as any} size={16} color="#fff" />
                </View>
                <View style={s.linkCopy}>
                  <Text style={s.platform}>{meta.label}</Text>
                  <Text style={s.url} numberOfLines={1}>{link.url}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            );
          })}
          {links.length === 0 ? <Text style={s.empty}>No public links yet.</Text> : null}
        </View>
        {primary ? (
          <Pressable accessibilityRole="button" onPress={() => openLink(primary.platform, primary.url)}>
            <LinearGradient colors={[colors.accentFrom, colors.accentTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
              <Text style={s.ctaText}>Open {platformMeta(primary.platform).label}</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          style={s.profileBtn}
          onPress={() => {
            onClose();
            router.push(`/profile/${user.username}`);
          }}
        >
          <Text style={s.profileText}>View profile</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  background: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { backgroundColor: colors.textTertiary, width: 40, height: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 14 },
  header: { alignItems: 'center', gap: 4 },
  name: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 22, marginTop: 6 },
  username: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  score: { color: colors.success, fontFamily: fonts.semibold, fontSize: 13, marginTop: 2 },
  bio: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginTop: 4 },
  links: { gap: 8 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface2,
    borderRadius: 14,
    padding: 12,
  },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkCopy: { flex: 1, gap: 2 },
  platform: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14 },
  url: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 12 },
  empty: { color: colors.textTertiary, fontFamily: fonts.regular, textAlign: 'center' },
  cta: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16 },
  profileBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  profileText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 15 },
});
