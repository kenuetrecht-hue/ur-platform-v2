import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { effectiveTabBarBottomInset } from "@/lib/layout-overlap";

/**
 * Native iOS/Android home-indicator / nav-bar inset, plus phone browser / PWA.
 * Empty space under the app tabs — never a fake extra phone toolbar.
 */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  const [pad, setPad] = useState(() => effectiveTabBarBottomInset(insets.bottom));

  useEffect(() => {
    const read = () => setPad(effectiveTabBarBottomInset(insets.bottom));
    read();
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    window.visualViewport?.addEventListener("resize", read);
    window.addEventListener("resize", read);
    return () => {
      window.visualViewport?.removeEventListener("resize", read);
      window.removeEventListener("resize", read);
    };
  }, [insets.bottom]);

  return Math.max(pad, effectiveTabBarBottomInset(insets.bottom));
}
