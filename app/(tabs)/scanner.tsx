import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/UI/Button';
import FaceFrame from '@/components/Scanner/FaceFrame';
import MatchBottomSheet from '@/components/Scanner/MatchBottomSheet';
import { colors, fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useFaceScanner } from '@/hooks/useFaceScanner';

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAuth();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const scanning = Boolean(permission?.granted) && !sheetOpen;
  const { cameraRef, phase, faceReady, match, hint, reset } = useFaceScanner(scanning);

  const frameStatus =
    phase === 'matched' ? 'matched' : phase === 'searching' || faceReady ? 'detecting' : phase === 'scanning' ? 'scanning' : 'idle';

  const closeSheet = () => {
    setSheetOpen(false);
    reset();
  };

  useEffect(() => {
    if (match && phase === 'matched') setSheetOpen(true);
  }, [match, phase]);

  if (!permission?.granted) {
    return (
      <View style={[s.permRoot, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <Ionicons name="camera-outline" size={42} color={colors.textPrimary} />
        <Text style={s.permTitle}>Camera access needed</Text>
        <Text style={s.permSub}>FaceTag uses the camera to recognize enrolled faces. Photos are not saved on the server.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'FT';

  return (
    <View style={s.root}>
      <StatusBar hidden />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={flash && facing === 'back'}
      />
      <View style={[s.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
        <View style={s.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle flash" onPress={() => setFlash((value) => !value)} style={s.controlBtn}>
            <Ionicons name={flash ? 'flash' : 'flash-outline'} size={20} color={flash ? '#F5A623' : '#fff'} />
          </Pressable>
          <Text style={s.brand}>FaceTag</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/(tabs)/profile')} style={s.controlBtn}>
            <Text style={s.initials}>{initials}</Text>
          </Pressable>
        </View>
        <View style={s.center}>
          <FaceFrame status={frameStatus} />
          {hint ? <Text style={s.statusText}>{hint}</Text> : null}
        </View>
        <View style={s.bottomBar}>
          <View style={s.controlBtn} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
            onPress={() => setFacing((value) => (value === 'back' ? 'front' : 'back'))}
            style={s.controlBtn}
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
      <MatchBottomSheet isVisible={sheetOpen} matchData={match} onClose={closeSheet} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#fff', fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0.4 },
  center: { alignItems: 'center', gap: 16 },
  statusText: {
    color: '#fff',
    fontFamily: fonts.medium,
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between' },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#fff', fontFamily: fonts.semibold, fontSize: 12 },
  permRoot: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 },
  permTitle: { color: '#fff', fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  permSub: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
