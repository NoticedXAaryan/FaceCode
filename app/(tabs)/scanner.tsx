import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Avatar from '@/components/UI/Avatar';
import Button from '@/components/UI/Button';
import FaceFrame from '@/components/Scanner/FaceFrame';
import MatchBottomSheet from '@/components/Scanner/MatchBottomSheet';
import { colors, fonts } from '@/constants/theme';
import { getCurrentUserToken } from '@/services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type ScanStatus = 'idle' | 'scanning' | 'detecting' | 'matched';

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);

  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState(false);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [matchData, setMatchData] = useState<any>(null);
  const [isMatchFound, setIsMatchFound] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  const clearScanLoop = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  const scanOnce = useCallback(async () => {
    if (!cameraRef.current || isMatchFound || isScanningRef.current) return;

    isScanningRef.current = true;
    setStatus('detecting');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        skipProcessing: true,
      });

      if (!photo?.base64) {
        setStatus('scanning');
        return;
      }

      const token = await getCurrentUserToken();
      const response = await axios.post(
        `${API_URL}/api/scan/match`,
        { imageBase64: photo.base64 },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        },
      );

      if (response.data?.matched === true) {
        clearScanLoop();
        setMatchData(response.data);
        setIsMatchFound(true);
        setShowSheet(true);
        setStatus('matched');
        return;
      }

      setStatus('scanning');
    } catch (e: any) {
      if (e.response?.status === 503) {
        clearScanLoop();
        setStatus('idle');
        scanTimeoutRef.current = setTimeout(() => {
          if (!isMatchFound) {
            startScanLoop();
          }
        }, 15000);
      }
    } finally {
      isScanningRef.current = false;
    }
  }, [clearScanLoop, isMatchFound]);

  const startScanLoop = useCallback(() => {
    clearScanLoop();

    if (isMatchFound) return;

    setStatus('scanning');
    scanIntervalRef.current = setInterval(() => {
      scanOnce();
    }, 2000);
  }, [clearScanLoop, isMatchFound, scanOnce]);

  useEffect(() => {
    if (permission?.granted) {
      startScanLoop();
    }

    return () => {
      clearScanLoop();
    };
  }, [permission?.granted, startScanLoop, clearScanLoop]);

  const handleCloseSheet = () => {
    setShowSheet(false);
    setIsMatchFound(false);
    setMatchData(null);
    setStatus('idle');

    scanTimeoutRef.current = setTimeout(() => {
      startScanLoop();
    }, 1000);
  };

  const frameStatus =
    status === 'matched' ? 'matched' :
    status === 'detecting' ? 'detecting' :
    'idle';

  const statusText =
    status === 'detecting' ? 'Searching...' :
    status === 'matched' ? '' :
    'Point at a face';

  if (!permission?.granted) {
    return (
      <View style={[s.permRoot, { paddingTop: insets.top }]}> 
        <StatusBar style="light" />
        <Text style={s.permIcon}>dY"u</Text>
        <Text style={s.permTitle}>Camera access needed</Text>
        <Text style={s.permSub}>FaceTag needs your camera to scan faces.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar hidden />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} enableTorch={flash} />

      <View style={[s.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}> 
        <View style={s.topBar}>
          <Pressable onPress={() => setFlash((f) => !f)} style={s.controlBtn}>
            <Ionicons name={flash ? 'flash' : 'flash-outline'} size={20} color={flash ? '#F5A623' : '#fff'} />
          </Pressable>
          <Text style={s.brand}>FaceTag</Text>
          <Pressable onPress={() => router.push('/(tabs)/profile')} style={s.controlBtn}>
            <Avatar size={32} initials="FT" />
          </Pressable>
        </View>

        <View style={s.center}>
          <FaceFrame status={frameStatus} />
          {statusText ? <Text style={s.statusText}>{statusText}</Text> : null}
        </View>

        <View style={s.bottomBar}>
          <View style={s.controlBtn} />
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={s.controlBtn}
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <MatchBottomSheet isVisible={showSheet} matchData={matchData} onClose={handleCloseSheet} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { color: '#fff', fontFamily: fonts.semibold, fontSize: 16 },
  center: { alignItems: 'center', gap: 14 },
  statusText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15 },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permRoot: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  permIcon: { fontSize: 48 },
  permTitle: { color: '#fff', fontFamily: fonts.bold, fontSize: 20, textAlign: 'center' },
  permSub: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center' },
});
