import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { theme } from '@/constants/theme';

type Status = 'idle' | 'detecting' | 'matched' | 'notfound';

export default function FaceFrame({ status }: { status: Status }) {
  const pulse = useSharedValue(1);
  const opacity = useSharedValue(status === 'idle' ? 0.4 : 1);
  const translateX = useSharedValue(0);
  const scanY = useSharedValue(0);

  if (status === 'detecting') {
    pulse.value = withRepeat(withTiming(1.02, { duration: 650 }), -1, true);
    opacity.value = withRepeat(withTiming(0.5, { duration: 650 }), -1, true);
    scanY.value = withRepeat(withTiming(228, { duration: 1100 }), -1, false);
  }
  if (status === 'matched') {
    pulse.value = withSequence(withSpring(1.05), withSpring(1));
    opacity.value = 1;
    scanY.value = 0;
  }
  if (status === 'notfound') {
    translateX.value = withSequence(withTiming(-8, { duration: 70 }), withTiming(8, { duration: 70 }), withTiming(0, { duration: 70 }));
    opacity.value = 1;
    scanY.value = 0;
  }

  const frameStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }, { translateX: translateX.value }], opacity: opacity.value }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scanY.value }] }));
  const color = status === 'matched' ? theme.colors.success : status === 'notfound' ? theme.colors.danger : theme.colors.textPrimary;

  return (
    <Animated.View style={[s.frame, frameStyle]}>
      {['tl', 'tr', 'bl', 'br'].map((k) => <View key={k} style={[s.corner, s[k as keyof typeof s], { borderColor: color }]} />)}
      {status === 'detecting' ? <Animated.View style={[s.scanLine, { backgroundColor: theme.colors.accentMid }, lineStyle]} /> : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  frame: { width: 200, height: 240, borderRadius: 20, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: 'absolute', top: 6, left: 8, right: 8, height: 1, opacity: 0.7 }
});
