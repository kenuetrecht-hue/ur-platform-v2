import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT_OVERLAP } from "@/lib/layout-overlap";

/** Native: phone home-indicator inset. Web: fixed pad so tab labels stay visible. */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "web") return LAYOUT_OVERLAP.WEB_TAB_BAR_BOTTOM_PAD;
  return insets.bottom;
}
