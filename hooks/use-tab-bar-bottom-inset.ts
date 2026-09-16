import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Phone OS home-indicator / nav-bar height from react-native-safe-area-context. */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom;
}
