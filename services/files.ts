import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

async function readBlobAsBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read the image'));
    reader.readAsDataURL(blob);
  });
}

/**
 * expo-file-system's web shim does not implement readAsStringAsync.
 * Browsers read the camera/photo blob through FileReader instead.
 */
export async function readUriAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') return readBlobAsBase64(uri);
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return readBlobAsBase64(uri);
  }
}
