import { useFaceDetection, type RNMLKitFace } from '@infinitered/react-native-mlkit-face-detection';
import type { CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const STABLE_MS = 900;

function isFaceWellFramed(face: RNMLKitFace, imageW: number, imageH: number): boolean {
  const { frame } = face;
  const faceW = frame.size.x;
  const faceH = frame.size.y;
  const faceSize = Math.max(faceW, faceH);
  const minDim = Math.min(imageW, imageH);

  if (faceSize < minDim * 0.12) return false;

  const cx = frame.origin.x + faceW / 2;
  const cy = frame.origin.y + faceH / 2;

  return (
    Math.abs(cx - imageW / 2) < imageW * 0.38 &&
    Math.abs(cy - imageH / 2) < imageH * 0.38
  );
}

export async function detectFaceInUri(
  detector: ReturnType<typeof useFaceDetection>,
  uri: string,
  width = 640,
  height = 480,
): Promise<boolean> {
  const result = await detector.detectFaces(uri);
  const faces = result?.faces ?? [];
  return faces.some((face) => isFaceWellFramed(face, width, height));
}

type Options = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useLiveFaceDetection(
  cameraRef: RefObject<CameraView | null>,
  { enabled = true, intervalMs = 650 }: Options = {},
) {
  const detector = useFaceDetection();
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceReady, setFaceReady] = useState(false);
  const [detectorReady, setDetectorReady] = useState(true);
  const scanningRef = useRef(false);
  const stableSinceRef = useRef<number | null>(null);

  const checkFrame = useCallback(async () => {
    if (!enabled || !cameraRef.current || scanningRef.current) return;

    scanningRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.1,
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.uri) return;

      const result = await detector.detectFaces(photo.uri);
      const faces = result?.faces ?? [];
      const w = photo.width ?? 640;
      const h = photo.height ?? 480;
      const valid = faces.some((face) => isFaceWellFramed(face, w, h));

      setFaceDetected(valid);
      setDetectorReady(true);

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
      setDetectorReady(false);
      setFaceDetected(false);
      setFaceReady(false);
    } finally {
      scanningRef.current = false;
    }
  }, [cameraRef, detector, enabled]);

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

  return { faceDetected, faceReady, detectorReady, detector };
}
