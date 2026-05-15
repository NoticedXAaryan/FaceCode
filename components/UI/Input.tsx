import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';

type Props = TextInputProps & { label?: string; error?: string };

export default function Input({ label, error, style, value, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const hasValue = !!(value && String(value).length > 0);
  const active = focused || hasValue;

  const progress = useSharedValue(active ? 1 : 0);
  const borderProgress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 200 });
  }, [active]);

  useEffect(() => {
    borderProgress.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -14]) },
      { scale: interpolate(progress.value, [0, 1], [1, 0.78]) },
    ],
    color: interpolateColor(
      progress.value,
      [0, 1],
      [colors.textTertiary, focused ? colors.accent : colors.textSecondary],
    ),
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      borderProgress.value,
      [0, 1],
      ['transparent', error ? colors.danger : colors.accent],
    ),
  }));

  const isMultiline = !!props.multiline;
  const inputHeight = isMultiline ? 80 : 56;

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.container, { height: inputHeight }, borderStyle]}>
        {label ? (
          <Animated.Text
            style={[s.floatLabel, labelStyle, { top: isMultiline ? 10 : 18 }]}
            pointerEvents="none"
          >
            {label}
          </Animated.Text>
        ) : null}
        <TextInput
          {...props}
          value={value}
          placeholderTextColor="transparent"
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            s.input,
            label ? { paddingTop: 22 } : null,
            isMultiline ? { height: 80, textAlignVertical: 'top', paddingTop: label ? 28 : 12 } : null,
            style,
          ]}
        />
      </Animated.View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 4 },
  container: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
  },
  floatLabel: {
    position: 'absolute',
    left: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textTertiary,
  },
  input: {
    height: '100%',
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: 11,
    paddingLeft: 4,
  },
});