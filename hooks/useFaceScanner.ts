import { useCallback, useEffect, useRef, useState } from 'react';
import { type CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import api from '@/services/api';
import { hasLikelySubjectInBase64 } from '@/services/frameAnalysis';

export type ScanPhase = 'idle' | 'scanning' | 'searching' | 'matched' | 'paused';

export interface MatchResult {
  matched: boolean;
  score?: number;
  engine?: string;
  message?: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
    bio?: string;
    avatar_url?: string;
    is_public?: boolean;
    primary_link_platform?: string;
  };
  links?: { platform: string; url: string; display_order?: number }[];
}

export function useFaceScanner(enabled: boolean) {
  const cameraRef = useRef<CameraView>(null);
  const matchedRef = useRef(false);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceReady, setFaceReady] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [hint, setHint] = useState('Point at a face');

  const reset = useCallback(() => {
    matchedRef.current = false;
    setMatch(null);
    setPhase('idle');
    setHint('Point at a face');
    setFaceDetected(false);
    setFaceReady(false);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let busy = false;
    let stableSince: number | null = null;

    const timer = setInterval(async () => {
      if (cancelled || busy || matchedRef.current || !cameraRef.current) return;
      busy = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.35,
          skipProcessing: true,
          shutterSound: false,
        });
        if (cancelled || !photo?.base64) return;

        const valid = hasLikelySubjectInBase64(photo.base64);
        setFaceDetected(valid);
        if (!valid) {
          stableSince = null;
          setFaceReady(false);
          setPhase('idle');
          setHint('Point at a face');
          return;
        }

        if (!stableSince) stableSince = Date.now();
        const ready = Date.now() - stableSince >= 800;
        setFaceReady(ready);
        if (!ready) {
          setPhase('scanning');
          setHint('Hold still…');
          return;
        }

        setPhase('searching');
        setHint('Searching FaceTag…');
        const { data } = await api.post('/api/scan/match', { imageBase64: photo.base64 }, { timeout: 30000 });
        if (cancelled) return;
        if (data?.matched && data.user) {
          matchedRef.current = true;
          setMatch(data);
          setPhase('matched');
          setHint('');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return;
        }
        setPhase('scanning');
        setHint(data?.message || 'No public match yet');
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 503) {
          setPhase('paused');
          setHint('Face service is warming up');
        } else if (status === 429) {
          setHint('Slowing down for a moment');
        } else if (status === 400) {
          setPhase('idle');
          setHint('Center a face in the frame');
        } else if (!error?.response) {
          setHint('Can’t reach FaceTag');
        }
      } finally {
        busy = false;
      }
    }, 1400);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  return { cameraRef, phase, faceDetected, faceReady, match, hint, reset };
}
