import { useEffect, useState } from "react";
import { useThemeContext } from "@/lib/theme-provider";
import type { ColorScheme } from "@/constants/theme";

/**
 * Web hook — reads the app theme from ThemeProvider (not the OS preference).
 * Returns "light" until hydrated to avoid static-render mismatches.
 */
export function useColorScheme(): ColorScheme {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { colorScheme } = useThemeContext();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return "light";
  }

  return colorScheme;
}
