import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { TokenCache } from '@clerk/expo';

const webStore = {
  async get(key: string) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: string) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode can reject storage. Clerk still keeps the session in memory.
    }
  },
  async remove(key: string) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Already empty.
    }
  },
};

/**
 * Clerk's Expo token cache is native-only. On web we persist the session in
 * localStorage so a refresh does not sign the person out.
 */
export const tokenCache: TokenCache = {
  async getToken(key) {
    if (Platform.OS === 'web') return webStore.get(key);
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key, token) {
    if (Platform.OS === 'web') {
      await webStore.set(key, token);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, token);
    } catch {
      // A failed write leaves the in-memory session intact.
    }
  },
  clearToken(key) {
    if (Platform.OS === 'web') {
      void webStore.remove(key);
      return;
    }
    void SecureStore.deleteItemAsync(key).catch(() => {});
  },
};
