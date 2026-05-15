import type { CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { hasLikelySubjectInUri } from '@/services/frameAnalysis';

const STABLE_MS = 900;

type Options = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useLiveFaceDetection(
  cameraRef: RefObject<CameraView | null>,
  { enabled = true, intervalMs = 700 }: Options = {},
) {
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceReady, setFaceReady] = useState(false);
  const scanningRef = useRef(false);
  const stableSinceRef = useRef<number | null>(null);

  const checkFrame = useCallback(async () => {
    if (!enabled || !cameraRef.current || scanningRef.current) return;

    scanningRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.12,
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.uri) return;

      const valid = await hasLikelySubjectInUri(photo.uri);

      setFaceDetected(valid);

      if (valid) {
        if (!stableSinceRef.current) stableSinceRef.current = Date.now();
        if (Date.now() - (stableSinceRef.current ?? 0) >= STABLE_MS) {
          setFaceReady(true);
        }
      } else {
        stableSinceRef.current = null;
        setFaceReady(false);
      }
    } catch {
      setFaceDetected(false);
      setFaceReady(false);
    } finally {
      scanningRef.current = false;
    }
  }, [cameraRef, enabled]);

  useEffect(() => {
    if (!enabled) {
      setFaceDetected(false);
      setFaceReady(false);
      stableSinceRef.current = null;
      return;
    }

    const id = setInterval(() => {
      checkFrame();
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled, intervalMs, checkFrame]);

  return { faceDetected, faceReady };
}
