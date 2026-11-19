import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '@/components/UI/Input';
import { PLATFORMS, type PlatformId } from '@/constants/platforms';
import { colors, fonts } from '@/constants/theme';

export type EditorLink = { platform: string; url: string };

type Props = {
  links: EditorLink[];
  primary?: string | null;
  onChange: (links: EditorLink[]) => void;
  onPrimary: (platform: string) => void;
};

export default function LinkEditor({ links, primary, onChange, onPrimary }: Props) {
  const used = new Set(links.map((link) => link.platform));

  const update = (platform: string, url: string) => {
    onChange(links.map((link) => (link.platform === platform ? { ...link, url } : link)));
  };

  const add = (platform: PlatformId) => {
    if (used.has(platform)) return;
    const next = [...links, { platform, url: '' }];
    onChange(next);
    if (!primary) onPrimary(platform);
  };

  const remove = (platform: string) => {
    const next = links.filter((link) => link.platform !== platform);
    onChange(next);
    if (primary === platform) onPrimary(next[0]?.platform || '');
  };

  return (
    <View style={s.wrap}>
      <Text style={s.label}>Links</Text>
      <View style={s.chips}>
        {PLATFORMS.map((platform) => {
          const active = used.has(platform.id);
          return (
            <Pressable
              key={platform.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${platform.label}`}
              onPress={() => (active ? remove(platform.id) : add(platform.id))}
              style={[s.chip, active && s.chipOn]}
            >
              <Ionicons name={platform.icon as any} size={14} color={active ? '#fff' : colors.textSecondary} />
              <Text style={[s.chipText, active && s.chipTextOn]}>{platform.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {links.map((link) => {
        const meta = PLATFORMS.find((item) => item.id === link.platform);
        return (
          <View key={link.platform} style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.platform}>{meta?.label || link.platform}</Text>
              <Pressable accessibilityRole="button" onPress={() => onPrimary(link.platform)}>
                <Text style={s.primary}>{primary === link.platform ? 'Primary' : 'Set primary'}</Text>
              </Pressable>
            </View>
            <Input
              placeholder={`${meta?.label || 'Link'} URL`}
              value={link.url}
              onChangeText={(url) => update(link.platform, url)}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  label: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipOn: { backgroundColor: colors.surface2, borderColor: colors.accentMid },
  chipText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12 },
  chipTextOn: { color: colors.textPrimary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  platform: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14 },
  primary: { color: colors.accentMid, fontFamily: fonts.medium, fontSize: 12 },
});
