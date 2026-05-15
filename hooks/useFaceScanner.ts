import { useCallback, useEffect, useRef, useState } from 'react';
import { type CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import { fileToBase64 } from '../services/faceUtils';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ScanStatus = 'idle' | 'detecting' | 'matching' | 'matched' | 'notfound' | 'error';

export interface MatchResult {
  matched: boolean;
  user?: {
    id: string;
    username: string;
    full_name: string;
    bio?: string;
    avatar_url?: string;
    is_public?: boolean;
    primary_link_platform?: string;
  };
  links?: Array<{
    platform: string;
    url: string;
    display_order: number;
  }>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useFaceScanner() {
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedUntilRef = useRef<number>(0);

  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // ── Capture + match ──────────────────────────────────────────────────────

  const captureAndMatch = useCallback(async () => {
    if (!cameraRef.current) return;

    // Rate limit check
    if (Date.now() < pausedUntilRef.current) return;

    try {
      setScanStatus('detecting');
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4 });
      if (!photo) {
        setScanStatus('idle');
        return;
      }

      setScanStatus('matching');
      const imageBase64 = await fileToBase64(photo.uri);
      const { data } = await api.post('/api/scan/match', { imageBase64 });

      if (data.matched) {
        setScanStatus('matched');
        setMatchResult(data);
        setIsScanning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        setScanStatus('notfound');
        setMatchResult(null);
        // Reset to idle after a brief display
        setTimeout(() => {
          setScanStatus((prev) => (prev === 'notfound' ? 'idle' : prev));
        }, 2000);
      }
    } catch (e: any) {
      // Handle rate limiting
      if (e.response?.status === 429) {
        pausedUntilRef.current = Date.now() + 10000;
      }
      setScanStatus('error');
      setTimeout(() => {
        setScanStatus((prev) => (prev === 'error' ? 'idle' : prev));
      }, 2000);
    }
  }, []);

  // ── Start / stop / reset ──────────────────────────────────────────────────

  const startScanning = useCallback(() => {
    setIsScanning(true);
    setMatchResult(null);
    setScanStatus('idle');
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetScan = useCallback(() => {
    setMatchResult(null);
    setScanStatus('idle');
    startScanning();
  }, [startScanning]);

  // ── Interval logic ────────────────────────────────────────────────────────

  useEffect(() => {
    if (isScanning) {
      // Clear any existing interval
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        captureAndMatch();
      }, 1500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isScanning, captureAndMatch]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    cameraRef,
    isScanning,
    scanStatus,
    matchResult,
    startScanning,
    stopScanning,
    resetScan,
    captureAndMatch,
  };
}
