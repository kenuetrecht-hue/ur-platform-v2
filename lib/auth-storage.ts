import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const ACCESS_TOKEN_KEY = "accessToken";
export const USER_STORAGE_KEY = "user";

export async function getAccessToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to get access token:", error);
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function removeAccessToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to remove access token:", error);
  }
}

export async function getStoredUserJson(): Promise<string | null> {
  try {
    return AsyncStorage.getItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to get stored user:", error);
    return null;
  }
}

export async function setStoredUserJson(userJson: string): Promise<void> {
  await AsyncStorage.setItem(USER_STORAGE_KEY, userJson);
}

export async function removeStoredUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error("[AuthStorage] Failed to remove stored user:", error);
  }
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([removeAccessToken(), removeStoredUser()]);
}
