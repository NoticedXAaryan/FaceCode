import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import axios from 'axios';
import FaceFrame from '@/components/Scanner/FaceFrame';
import Button from '@/components/UI/Button';
import { useToast } from '@/components/UI/Toast';
import { colors, fonts } from '@/constants/theme';
import { getCurrentUserToken } from '@/services/supabase';

const { width: SCREEN_W } = Dimensions.get('window');
const PREVIEW_W = SCREEN_W - 48;
const PREVIEW_H = 340;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const LOADING_MESSAGES = [
  'Analyzing your face...',
  'Computing face signature...',
  'Securing your identity...',
];

export default function EnrollScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [busy, setBusy] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const msgInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const captureScale = useSharedValue(1);
  const captureAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  useEffect(() => {
    if (enrolling) {
      let idx = 0;
      msgInterval.current = setInterval(() => {
        idx = (idx + 1) % LOADING_MESSAGES.length;
        setLoadingMsg(LOADING_MESSAGES[idx]);
      }, 3000);
    } else if (msgInterval.current) {
      clearInterval(msgInterval.current);
      msgInterval.current = null;
    }

    return () => {
      if (msgInterval.current) {
        clearInterval(msgInterval.current);
        msgInterval.current = null;
      }
    };
  }, [enrolling]);

  const enrollFace = async (base64: string, retryCount = 0) => {
    setEnrolling(true);
    setError('');

    try {
      const token = await getCurrentUserToken();
      await axios.post(
        `${API_URL}/api/users/enroll-face`,
        { imageBase64: base64 },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000,
        },
      );

      setEnrolling(false);
      setEnrolled(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.replace('/setup');
    } catch (e: any) {
      if (e.response?.status === 503 && retryCount === 0) {
        setLoadingMsg('AI warming up, retrying in 15s...');
        setTimeout(() => {
          enrollFace(base64, 1);
        }, 15000);
        return;
      }

      setEnrolling(false);
      setEnrolled(false);
      const msg = e.response?.data?.error || e.message || 'Enrollment failed';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    setBusy(true);
    setError('');

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (!photo?.base64) {
        throw new Error('Could not capture image');
      }

      setPreviewUri(photo.uri);
      await enrollFace(photo.base64);
    } catch (e: any) {
      const msg = e.message || 'Camera capture failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setPreviewUri(null);
    setEnrolled(false);
    setError('');
  };

  if (!permission?.granted) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="light" />
        <View style={s.permBox}>
          <Text style={s.permIcon}>dY"u</Text>
          <Text style={s.permTitle}>Camera access needed</Text>
          <Text style={s.permSub}>
            FaceTag needs your camera to capture your face for enrollment.
          </Text>
          <Button title="Grant camera access" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      <View style={s.progressBar}>
        <LinearGradient
          colors={[colors.accentFrom, colors.accentTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.progressFill, { width: '50%' }]}
        />
      </View>
      <Text style={s.stepText}>Step 1 of 2 - Enroll Face</Text>

      <View style={s.cameraWrap}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={s.preview} />
        ) : (
          <CameraView ref={cameraRef} style={s.preview} facing="front" />
        )}
        <View style={s.frameOverlay}>
          <FaceFrame status={enrolled ? 'matched' : enrolling ? 'detecting' : 'idle'} />
        </View>
      </View>

      <View style={s.actions}>
        {enrolled ? (
          <View style={s.successBox}>
            <Text style={s.successIcon}>OK</Text>
            <Text style={s.successText}>Face enrolled!</Text>
          </View>
        ) : enrolling ? (
          <View style={s.statusBox}>
            <ActivityIndicator size="large" color={colors.accentMid} />
            <Text style={s.statusText}>{loadingMsg}</Text>
          </View>
        ) : error ? (
          <View style={s.statusBox}>
            <Text style={s.errorText}>{error}</Text>
            <Button title="Try Again" onPress={retry} variant="outline" />
          </View>
        ) : (
          <>
            <Text style={s.hint}>Position your face in the frame</Text>
            <Animated.View style={captureAnimated}>
              <Pressable
                onPress={handleCapture}
                disabled={busy}
                onPressIn={() => (captureScale.value = withSpring(0.9))}
                onPressOut={() => (captureScale.value = withSpring(1))}
                style={s.captureOuter}
              >
                <LinearGradient
                  colors={[colors.accentFrom, colors.accentTo]}
                  style={s.captureInner}
                />
              </Pressable>
            </Animated.View>
          </>
        )}
      </View>

      {!enrolled && !enrolling && (
        <Pressable
          onPress={() => router.replace('/setup')}
          style={s.skipWrap}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <Text style={s.skipText}>Skip for now</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: 999,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 999 },
  stepText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  cameraWrap: {
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  preview: { width: PREVIEW_W, height: PREVIEW_H },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { alignItems: 'center', gap: 16, flex: 1, justifyContent: 'center' },
  hint: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15 },
  captureOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 58, height: 58, borderRadius: 29 },
  statusBox: { alignItems: 'center', gap: 14 },
  statusText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, textAlign: 'center' },
  errorText: { color: colors.danger, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center' },
  successBox: { alignItems: 'center', gap: 8 },
  successIcon: { color: colors.success, fontSize: 24, fontFamily: fonts.bold },
  successText: { color: colors.success, fontFamily: fonts.bold, fontSize: 22 },
  skipWrap: { paddingVertical: 16 },
  skipText: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 14 },
  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 24 },
  permIcon: { fontSize: 48 },
  permTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 20, textAlign: 'center' },
  permSub: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center' },
});
