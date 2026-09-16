import { useSafeAreaInsets } from "react-native-safe-area-context";
import { effectiveTabBarBottomInset } from "@/lib/layout-overlap";

/** Bottom padding that keeps Home / Admin / AIs / Profile / Social above the phone toolbar. */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  return effectiveTabBarBottomInset(insets.bottom);
}
