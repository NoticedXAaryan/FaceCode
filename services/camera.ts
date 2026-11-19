import { Platform } from 'react-native';

/** Native builds always have a camera module. Web needs getUserMedia. */
export function isCameraSupported() {
  if (Platform.OS !== 'web') return true;
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
}
