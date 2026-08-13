import { useEffect, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

/**
 * useWindowDimensions() can report 0 on Expo web during SSR/hydration,
 * which collapses flex layouts and stacks text vertically. Fall back to
 * window.innerWidth until RN reports a real value.
 */
export function useStableWindowWidth(): number {
  const { width } = useWindowDimensions();
  const [fallback, setFallback] = useState(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 390;
  });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onResize = () => setFallback(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width > 0 ? width : fallback;
}
