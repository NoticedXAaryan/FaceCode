import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function webVibrate(duration: number) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(duration);
  }
}

/** Native haptics, with the Web Vibration API when the browser supports it. */
export async function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS === 'web') {
    const heavy = style === Haptics.ImpactFeedbackStyle.Heavy || style === Haptics.ImpactFeedbackStyle.Rigid;
    webVibrate(heavy ? 28 : 12);
    return;
  }
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Simulators and some Android devices have no haptics engine.
  }
}

export async function notify(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) {
  if (Platform.OS === 'web') {
    webVibrate(type === Haptics.NotificationFeedbackType.Error ? 40 : 18);
    return;
  }
  try {
    await Haptics.notificationAsync(type);
  } catch {
    // Simulators and some Android devices have no haptics engine.
  }
}

export const ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = Haptics.NotificationFeedbackType;
