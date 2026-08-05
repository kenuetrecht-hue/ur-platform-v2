import type { ThemeColorPalette } from "@/constants/theme";

/** Append alpha to #RRGGBB hex (React Native 8-digit hex). */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  const a = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return `${hex}${a}`;
  if (/^#[0-9A-Fa-f]{8}$/.test(hex)) return `${hex.slice(0, 7)}${a}`;
  return hex;
}

export function brandGradientPair(colors: ThemeColorPalette): [string, string] {
  return [colors.primary, colors.secondary];
}

export function brandSoftGradientPair(colors: ThemeColorPalette): [string, string] {
  return [withAlpha(colors.primary, 0.14), withAlpha(colors.secondary, 0.08)];
}

export function brandDisclosureSurface(colors: ThemeColorPalette) {
  return {
    backgroundColor: colors.background,
    borderColor: withAlpha(colors.border, 0.4),
  };
}

export function brandHighlightSurface(colors: ThemeColorPalette) {
  return {
    backgroundColor: withAlpha(colors.primary, 0.08),
    borderColor: withAlpha(colors.secondary, 0.2),
  };
}

export function brandPaySurface(colors: ThemeColorPalette) {
  return {
    backgroundColor: withAlpha(colors.primary, 0.1),
    borderColor: withAlpha(colors.secondary, 0.24),
  };
}

export function brandTabActiveSurface(colors: ThemeColorPalette) {
  return {
    backgroundColor: withAlpha(colors.primary, 0.16),
  };
}
