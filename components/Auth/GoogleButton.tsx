import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/constants/theme';

type Props = {
  onPress: () => void;
  loading?: boolean;
  label?: string;
};

export default function GoogleButton({
  onPress,
  loading = false,
  label = 'Continue with Google',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [s.button, pressed && s.pressed, loading && s.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
          <Text style={s.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  label: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15 },
});
