import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { isWebBrowserStorageAvailable } from "./supabase-auth-storage";
import { LANDING_DEMO_ATTRIBUTION_STORAGE_KEY } from "./landing-demo-attribution-types";

export async function saveLandingDemoAttributionId(id: string): Promise<void> {
  const value = id.trim();
  if (!value) return;
  if (isWebBrowserStorageAvailable()) {
    localStorage.setItem(LANDING_DEMO_ATTRIBUTION_STORAGE_KEY, value);
    return;
  }
  if (Platform.OS !== "web") {
    await AsyncStorage.setItem(LANDING_DEMO_ATTRIBUTION_STORAGE_KEY, value);
  }
}

export async function getLandingDemoAttributionId(): Promise<string | null> {
  if (isWebBrowserStorageAvailable()) {
    return localStorage.getItem(LANDING_DEMO_ATTRIBUTION_STORAGE_KEY);
  }
  if (Platform.OS !== "web") {
    return AsyncStorage.getItem(LANDING_DEMO_ATTRIBUTION_STORAGE_KEY);
  }
  return null;
}

export async function clearLandingDemoAttributionId(): Promise<void> {
  if (isWebBrowserStorageAvailable()) {
    localStorage.removeItem(LANDING_DEMO_ATTRIBUTION_STORAGE_KEY);
    return;
  }
  if (Platform.OS !== "web") {
    await AsyncStorage.removeItem(LANDING_DEMO_ATTRIBUTION_STORAGE_KEY);
  }
}
