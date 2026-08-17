import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  isWebBrowserStorageAvailable,
} from "./supabase-auth-storage";

export const ACCESS_TOKEN_KEY = "accessToken";
export const USER_STORAGE_KEY = "user";

async function webGetItem(key: string): Promise<string | null> {
  if (!isWebBrowserStorageAvailable()) return null;
  return localStorage.getItem(key);
}

async function webSetItem(key: string, value: string): Promise<void> {
  if (!isWebBrowserStorageAvailable()) return;
  localStorage.setItem(key, value);
}

async function webRemoveItem(key: string): Promise<void> {
  if (!isWebBrowserStorageAvailable()) return;
  localStorage.removeItem(key);
}

export async function getAccessToken(): Promise<string | null> {
  try {
    if (isWebBrowserStorageAvailable()) {
      return webGetItem(ACCESS_TOKEN_KEY);
    }
    if (Platform.OS === "web") {
      return null;
    }
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to get access token:", error);
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  if (isWebBrowserStorageAvailable()) {
    await webSetItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  if (Platform.OS === "web") {
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function removeAccessToken(): Promise<void> {
  try {
    if (isWebBrowserStorageAvailable()) {
      await webRemoveItem(ACCESS_TOKEN_KEY);
      return;
    }
    if (Platform.OS === "web") {
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
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
  await Promise.all([removeAccessToken(), removeStoredUser()]);
}
