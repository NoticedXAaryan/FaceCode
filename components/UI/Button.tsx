import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '@/constants/theme';

type Variant = 'gradient' | 'outline' | 'ghost' | 'danger';
type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
};

const AP = Animated.createAnimatedComponent(Pressable);

export default function Button({ title, onPress, variant = 'gradient', disabled, loading }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <AP
      onPress={handlePress}
      disabled={disabled || loading}
      onPressIn={() => (scale.value = withSpring(0.96))}
      onPressOut={() => (scale.value = withSpring(1))}
      android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: false }}
      style={[
        animated,
        s.base,
        variant === 'outline' && s.outline,
        variant === 'ghost' && s.ghost,
        variant === 'danger' && s.danger,
        (disabled || loading) && s.disabled,
      ]}
    >
      {variant === 'gradient' ? (
        <LinearGradient
          colors={[colors.accentFrom, colors.accentMid, colors.accentTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.gradient}
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={s.text}>{title}</Text>
          )}
        </LinearGradient>
      ) : loading ? (
        <ActivityIndicator color={variant === 'danger' ? colors.danger : colors.textPrimary} />
      ) : (
        <Text style={[s.text, variant === 'ghost' && s.ghostText, variant === 'danger' && s.dangerText]}>
          {title}
        </Text>
      )}
    </AP>
  );
}

const s = StyleSheet.create({
  base: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
  ghost: { backgroundColor: 'transparent' },
  danger: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
  },
  disabled: { opacity: 0.6 },
  text: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15 },
  ghostText: { color: colors.accentMid },
  dangerText: { color: colors.danger },
});