import { Platform } from "react-native";
import { useStableWindowWidth } from "@/hooks/use-stable-window-width";
import { isWideDashboard } from "@/lib/dashboard-layout";

/** True on a wide browser window. Native and phone-width web stay on the bottom tabs. */
export function useWideDashboard(): boolean {
  const width = useStableWindowWidth();
  return isWideDashboard(width, Platform.OS);
}
