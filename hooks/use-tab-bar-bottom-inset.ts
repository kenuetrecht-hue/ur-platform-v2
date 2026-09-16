import { useSafeAreaInsets } from "react-native-safe-area-context";
import { effectiveTabBarBottomInset } from "@/lib/layout-overlap";

/**
 * Padding inside the real tab bar so Home / Admin / AIs / Profile / Social
 * sit above the phone home indicator. Same helper on native and mobile web.
 */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  return effectiveTabBarBottomInset(insets.bottom);
}
