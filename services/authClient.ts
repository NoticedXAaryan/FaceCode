import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from '@/constants/config';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const webStorage: StorageLike = {
  getItem(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode can reject storage.
    }
  },
  async getItemAsync(key) {
    return webStorage.getItem(key);
  },
  async setItemAsync(key, value) {
    webStorage.setItem(key, value);
  },
  async deleteItemAsync(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

const nativeStorage: StorageLike = {
  getItem(key) {
    // SecureStore is async-only; sync reads are unused on native paths.
    return null;
  },
  setItem() {
    // unused sync path on native
  },
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
};

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'facetag',
      storagePrefix: 'facetag',
      storage: Platform.OS === 'web' ? webStorage : nativeStorage,
    }),
  ],
});

export async function getAuthCookieHeader() {
  try {
    const cookies = await authClient.getCookie();
    return cookies || null;
  } catch {
    return null;
  }
}
