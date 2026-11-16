import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'jpeg-js';
import facePixels from '../logic/facePixels';

function base64ToBytes(base64: string): Uint8Array {
  const raw = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** True when the frame has a skin-toned subject rather than a blank or busy background. */
export function hasLikelySubjectInBase64(base64: string): boolean {
  try {
    const bytes = base64ToBytes(base64);
    const { data, width, height } = decode(bytes, { useTArray: true });
    if (!data?.length || width < 8 || height < 8) return false;
    return Boolean(facePixels.analyzeFrame(data, width, height).hasFace);
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
