import { useSafeAreaInsets } from "react-native-safe-area-context";
import { effectiveTabBarBottomInset } from "@/lib/layout-overlap";

/**
 * Native iOS/Android home-indicator / nav-bar inset, plus iOS PWA.
 * Empty padding under the app tabs — never a fake extra phone toolbar.
 */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  return effectiveTabBarBottomInset(insets.bottom);
}
