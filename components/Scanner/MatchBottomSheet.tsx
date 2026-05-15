import { useCallback, useMemo, useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '@/components/UI/Avatar';
import { colors, fonts } from '@/constants/theme';
import type { MatchResult } from '@/hooks/useFaceScanner';

// ─── Platform colors ────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  whatsapp: '#25D366',
  twitter: '#1DA1F2',
  x: '#1DA1F2',
  website: '#6C5CE7',
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  linkedin: '💼',
  whatsapp: '💬',
  twitter: '🐦',
  x: '🐦',
  website: '🌐',
};

// ─── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  isVisible: boolean;
  matchData: MatchResult | null;
  onClose: () => void;
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function MatchBottomSheet({ isVisible, matchData, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%', '85%'], []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    [],
  );

  if (!isVisible || !matchData?.user) return null;

  const user = matchData.user;
  const linksList = matchData.links || [];
  const primaryPlatform = user.primary_link_platform || linksList[0]?.platform || '';
  const primaryLink = linksList.find((l) => l.platform === primaryPlatform) || linksList[0];

  const openLink = (url: string) => {
    if (url && !url.startsWith('http')) url = 'https://' + url;
    if (url) Linking.openURL(url);
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
        {/* Profile header */}
        <View style={s.header}>
          <Avatar
            size={64}
            uri={user.avatar_url}
            initials={user.full_name?.slice(0, 2).toUpperCase() || 'FT'}
            showRing
            ringColor="green"
          />
          <Text style={s.name}>{user.full_name}</Text>
          <Text style={s.username}>@{user.username}</Text>
          {user.bio ? (
            <Text style={s.bio} numberOfLines={2}>
              {user.bio}
            </Text>
          ) : null}
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Links list */}
        <View style={s.linksList}>
          {linksList.map((link, idx) => {
            const pKey = link.platform.toLowerCase();
            return (
              <Pressable key={idx} style={s.linkRow} onPress={() => openLink(link.url)}>
                <View style={[s.platformIcon, { backgroundColor: PLATFORM_COLORS[pKey] || colors.accent }]}>
                  <Text style={s.platformEmoji}>{PLATFORM_ICONS[pKey] || '🔗'}</Text>
                </View>
                <View style={s.linkInfo}>
                  <Text style={s.platformName}>{link.platform}</Text>
                  <Text style={s.linkUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                <Text style={s.chevron}>›</Text>
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

        {/* Close button */}
        <Pressable style={s.closeButton} onPress={handleClose}>
          <Text style={s.closeText}>Close</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  background: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: colors.textTertiary,
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 20,
  },
  username: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  bio: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  linksList: {
    gap: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  platformIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformEmoji: {
    fontSize: 16,
  },
  linkInfo: {
    flex: 1,
    gap: 2,
  },
  platformName: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  linkUrl: {
    color: colors.textTertiary,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  ctaButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  closeButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
});
