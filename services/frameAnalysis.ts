import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'jpeg-js';

const MIN_STDDEV = 14;
const MIN_CENTER_STDDEV = 16;

function base64ToBytes(base64: string): Uint8Array {
  const raw = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function luminanceStdDev(
  data: Uint8Array,
  width: number,
  height: number,
  region?: { x0: number; y0: number; x1: number; y1: number },
): number {
  const x0 = region?.x0 ?? 0;
  const y0 = region?.y0 ?? 0;
  const x1 = region?.x1 ?? width;
  const y1 = region?.y1 ?? height;

  const values: number[] = [];
  const step = Math.max(2, Math.floor(Math.min(width, height) / 48));

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      values.push(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }

  if (values.length < 8) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Rejects blank / flat images (e.g. a photo of a white page). Works in Expo Go. */
export function hasLikelySubjectInBase64(base64: string): boolean {
  try {
    const bytes = base64ToBytes(base64);
    const { data, width, height } = decode(bytes, { useTArray: true });
    if (!data?.length || width < 8 || height < 8) return false;

    const full = luminanceStdDev(data, width, height);
    const cx0 = Math.floor(width * 0.2);
    const cy0 = Math.floor(height * 0.15);
    const cx1 = Math.floor(width * 0.8);
    const cy1 = Math.floor(height * 0.85);
    const center = luminanceStdDev(data, width, height, { x0: cx0, y0: cy0, x1: cx1, y1: cy1 });

    return full >= MIN_STDDEV && center >= MIN_CENTER_STDDEV;
  } catch {
    return false;
  }
}

export async function hasLikelySubjectInUri(uri: string): Promise<boolean> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return hasLikelySubjectInBase64(base64);
}
