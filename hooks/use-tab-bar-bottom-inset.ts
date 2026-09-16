import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  effectiveTabBarBottomInset,
  measureWebBottomOcclusion,
} from "@/lib/layout-overlap";

/** Bottom padding that keeps Home / Admin / AIs / Profile / Social above the phone toolbar. */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  const [occlusion, setOcclusion] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const measure = () => setOcclusion(measureWebBottomOcclusion());
    measure();
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return effectiveTabBarBottomInset(insets.bottom, occlusion);
}
