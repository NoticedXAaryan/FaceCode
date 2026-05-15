import { Pressable, StyleSheet, Text, View } from 'react-native';
import Input from '@/components/UI/Input';
import { theme } from '@/constants/theme';

export default function LinkRow({ platform, value, onChange, isPrimary, onSetPrimary }: { platform: string; value: string; onChange: (v: string) => void; isPrimary?: boolean; onSetPrimary?: () => void }) {
  return (
    <View style={s.card}>
      <View style={s.header}><Text style={s.platform}>{platform}</Text>{onSetPrimary ? <Pressable onPress={onSetPrimary}><Text style={s.primary}>{isPrimary ? '? Primary' : 'Set primary'}</Text></Pressable> : null}</View>
      <Input placeholder={`${platform} URL`} value={value} onChangeText={onChange} autoCapitalize="none" />
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.large, padding: theme.spacing.md, gap: theme.spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  platform: { color: theme.colors.textPrimary, fontFamily: theme.typography.title.fontFamily, fontSize: 14 },
  primary: { color: theme.colors.accentMid, fontFamily: theme.typography.caption.fontFamily, fontSize: 12 }
});
