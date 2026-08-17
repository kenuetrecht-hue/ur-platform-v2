import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupportedStorage } from "@supabase/supabase-js";

export const noopSupabaseAuthStorage: SupportedStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export function isNoopSupabaseAuthStorage(storage: SupportedStorage): boolean {
  return storage === noopSupabaseAuthStorage;
}

/** Real React Native app (device/simulator) — not Expo web SSR in Node. */
export function isReactNativeAppRuntime(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.product === "string" &&
    navigator.product === "ReactNative"
  );
}

export function isWebBrowserStorageAvailable(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof localStorage !== "undefined" &&
      typeof localStorage.getItem === "function"
    );
  } catch {
    return false;
  }
}

function createWebLocalStorageAdapter(): SupportedStorage {
  return {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key, value) => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      localStorage.removeItem(key);
      return Promise.resolve();
    },
  };
}

/** Web localStorage adapter — only call when `isWebBrowserStorageAvailable()`. */
export function createWebLocalStorageAuthStorage(): SupportedStorage {
  return createWebLocalStorageAdapter();
}

/**
 * Supabase auth storage that survives Expo web SSR.
 * SSR runs in Node with Platform.OS "ios" — AsyncStorage's web build crashes without window.
 */
export function createSupabaseAuthStorage(): SupportedStorage {
  if (isWebBrowserStorageAvailable()) {
    return createWebLocalStorageAdapter();
  }

  if (isReactNativeAppRuntime()) {
    return AsyncStorage;
  }

  return noopSupabaseAuthStorage;
}

export const isSupabaseBrowserClient = isWebBrowserStorageAvailable();
