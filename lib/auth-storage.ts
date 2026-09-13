import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  isWebBrowserStorageAvailable,
} from "./supabase-auth-storage";
import { getStayLoggedIn } from "./stay-logged-in";

/**
 * Phone sign-in lives in AsyncStorage, not SecureStore.
 * iOS Keychain (SecureStore) rejects values over 2048 bytes, and a real
 * login token is bigger than that — so the phone was never keeping the sign-in.
 */

export const ACCESS_TOKEN_KEY = "accessToken";
export const USER_STORAGE_KEY = "user";
export const REFRESH_TOKEN_KEY = "refreshToken";

/** tRPC reads the token on every request. Keep a copy in memory so sign-in
 * can call claimPass before localStorage finishes writing. */
let memoryAccessToken: string | null = null;

function webDurableStore(): Storage | null {
  if (!isWebBrowserStorageAvailable()) return null;
  return getStayLoggedIn() ? localStorage : sessionStorage;
}

async function webGetItem(key: string): Promise<string | null> {
  if (!isWebBrowserStorageAvailable()) return null;
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

async function webSetItem(key: string, value: string): Promise<void> {
  const store = webDurableStore();
  if (!store) return;
  store.setItem(key, value);
  if (store === localStorage) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  } else {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

async function webRemoveItem(key: string): Promise<void> {
  if (!isWebBrowserStorageAvailable()) return;
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export async function getAccessToken(): Promise<string | null> {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    if (isWebBrowserStorageAvailable()) {
      return webGetItem(ACCESS_TOKEN_KEY);
    }
    if (Platform.OS === "web") {
      return null;
    }
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to get access token:", error);
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  memoryAccessToken = token;
  if (isWebBrowserStorageAvailable()) {
    await webSetItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  if (Platform.OS === "web") {
    return;
  }
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function removeAccessToken(): Promise<void> {
  memoryAccessToken = null;
  try {
    if (isWebBrowserStorageAvailable()) {
      await webRemoveItem(ACCESS_TOKEN_KEY);
      return;
    }
    if (Platform.OS === "web") {
      return;
    }
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to remove access token:", error);
  }
}

export async function getStoredUserJson(): Promise<string | null> {
  try {
    if (isWebBrowserStorageAvailable()) {
      return webGetItem(USER_STORAGE_KEY);
    }
    if (Platform.OS === "web") {
      return null;
    }
    return AsyncStorage.getItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to get stored user:", error);
    return null;
  }
}

export async function setStoredUserJson(userJson: string): Promise<void> {
  if (isWebBrowserStorageAvailable()) {
    await webSetItem(USER_STORAGE_KEY, userJson);
    return;
  }
  if (Platform.OS === "web") {
    return;
  }
  await AsyncStorage.setItem(USER_STORAGE_KEY, userJson);
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    if (isWebBrowserStorageAvailable()) {
      return webGetItem(REFRESH_TOKEN_KEY);
    }
    if (Platform.OS === "web") {
      return null;
    }
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  if (isWebBrowserStorageAvailable()) {
    await webSetItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  if (Platform.OS === "web") {
    return;
  }
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export async function removeRefreshToken(): Promise<void> {
  try {
    if (isWebBrowserStorageAvailable()) {
      await webRemoveItem(REFRESH_TOKEN_KEY);
      return;
    }
    if (Platform.OS === "web") {
      return;
    }
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function removeStoredUser(): Promise<void> {
  try {
    if (isWebBrowserStorageAvailable()) {
      await webRemoveItem(USER_STORAGE_KEY);
      return;
    }
    if (Platform.OS === "web") {
      return;
    }
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to remove stored user:", error);
  }
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([removeAccessToken(), removeStoredUser(), removeRefreshToken()]);
}
