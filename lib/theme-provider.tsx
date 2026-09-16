import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";
import {
  LETTERING_ON_COLOR,
  LETTERING_ON_WHITE,
  applyDefaultLettering,
} from "@/lib/gold-lettering";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyCssColorVars(scheme: ColorScheme) {
  applyDefaultLettering(scheme === "light" ? LETTERING_ON_WHITE : LETTERING_ON_COLOR);
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = SchemeColors[scheme];
  for (const [name, value] of Object.entries(palette)) {
    root.style.setProperty(`--color-${name}`, value);
  }
  root.style.color = palette.foreground;
  root.dataset.theme = scheme;
  root.classList.toggle("dark", scheme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);

  // Apply initial scheme on mount
  useEffect(() => {
    nativewindColorScheme.set(systemScheme);
    Appearance.setColorScheme?.(systemScheme);
  }, []);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    applyCssColorVars(scheme);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  }, []);

  useEffect(() => {
    applyScheme(colorScheme);
    nativewindColorScheme.set(colorScheme);
    Appearance.setColorScheme?.(colorScheme);
  }, [colorScheme, applyScheme]);



  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
    }),
    [colorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1, color: SchemeColors[colorScheme].foreground } as object}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
