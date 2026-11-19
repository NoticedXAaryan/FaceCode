import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

type Status = 'idle' | 'scanning' | 'detecting' | 'matched' | 'notfound';

export default function FaceFrame({ status }: { status: Status }) {
  const pulse = useSharedValue(1);
  const opacity = useSharedValue(0.45);
  const translateX = useSharedValue(0);
  const scanY = useSharedValue(0);

  useEffect(() => {
    if (status === 'scanning') {
      pulse.value = 1;
      opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
      scanY.value = 0;
      return;
    }
    if (status === 'detecting') {
      pulse.value = withRepeat(withTiming(1.02, { duration: 650 }), -1, true);
      opacity.value = withRepeat(withTiming(0.55, { duration: 650 }), -1, true);
      scanY.value = withRepeat(withTiming(228, { duration: 1100 }), -1, false);
      return;
    }
    if (status === 'matched') {
      pulse.value = withSequence(withSpring(1.05), withSpring(1));
      opacity.value = 1;
      scanY.value = 0;
      return;
    }
    if (status === 'notfound') {
      translateX.value = withSequence(
        withTiming(-8, { duration: 70 }),
        withTiming(8, { duration: 70 }),
        withTiming(0, { duration: 70 }),
      );
      opacity.value = 1;
      scanY.value = 0;
      return;
    }
    pulse.value = 1;
    opacity.value = 0.45;
    scanY.value = 0;
  }, [status, opacity, pulse, scanY, translateX]);

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { translateX: translateX.value }],
    opacity: opacity.value,
  }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scanY.value }] }));
  const color =
    status === 'matched'
      ? theme.colors.success
      : status === 'notfound'
        ? theme.colors.danger
        : theme.colors.textPrimary;

  return (
    <Animated.View style={[s.frame, frameStyle]}>
      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
        <View key={corner} style={[s.corner, s[corner], { borderColor: color }]} />
      ))}
      {status === 'detecting' ? (
        <Animated.View style={[s.scanLine, { backgroundColor: theme.colors.accentMid }, lineStyle]} />
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  frame: { width: 220, height: 260, borderRadius: 28, position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },
  scanLine: { position: 'absolute', top: 8, left: 12, right: 12, height: 2, borderRadius: 2, opacity: 0.9 },
});
