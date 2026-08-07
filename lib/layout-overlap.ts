import { Platform } from "react-native";

/**
 * Overlap protocol — keep chat composers and scroll content clear of:
 * - iOS home indicator / Dynamic Island safe areas
 * - Android gesture nav & Samsung One UI nav bars
 * - Expo bottom tab bar (see app/(tabs)/_layout.tsx)
 * - Platform disclosure bars (PlatformDisclosureFrame)
 */
export const LAYOUT_OVERLAP = {
  TAB_BAR_CONTENT_HEIGHT: 56,
  TAB_BAR_TOP_PADDING: 6,
  TAB_BAR_MIN_BOTTOM_INSET: 8,
  /** PlatformDisclosureBar content below status inset (top bar). */
  TOP_DISCLOSURE_CONTENT_HEIGHT: 37,
  /** PlatformDisclosureBar content above home indicator (bottom bar on non-tab screens). */
  BOTTOM_DISCLOSURE_CONTENT_HEIGHT: 37,
  /** Compact disclosure row above tab bar (2 lines + padding). */
  BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT: 40,
  COMPOSER_MIN_PADDING: 8,
  /** Extra when Android reports 0 bottom inset (common on Samsung gesture nav). */
  ANDROID_NAV_BAR_BUFFER: 6,
  /** Samsung One UI often needs a hair more clearance above the tab bar. */
  SAMSUNG_TAB_BUFFER: 4,
  /** AIs tab chrome above the chat panel (header + mode row + specialist bar + surface tabs). */
  AIS_TAB_CHROME_HEIGHT: 168,
} as const;

/** Legal disclaimer strip height when stacked directly above the tab bar. */
export function bottomDisclaimerAboveTabHeight(): number {
  return LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT;
}

/** Total bottom chrome on tab screens: disclaimer + tab bar + home-indicator inset. */
export function bottomTabChromeHeight(bottomSafeInset: number): number {
  return bottomDisclaimerAboveTabHeight() + tabBarTotalHeight(bottomSafeInset);
}

export function tabBarTotalHeight(bottomSafeInset: number): number {
  const bottom = Math.max(bottomSafeInset, LAYOUT_OVERLAP.TAB_BAR_MIN_BOTTOM_INSET);
  return (
    LAYOUT_OVERLAP.TAB_BAR_CONTENT_HEIGHT +
    LAYOUT_OVERLAP.TAB_BAR_TOP_PADDING +
    bottom
  );
}

function androidBrandInfo(): { brand: string; manufacturer: string } {
  const constants = Platform.constants as { Brand?: string; Manufacturer?: string } | undefined;
  return {
    brand: String(constants?.Brand ?? ""),
    manufacturer: String(constants?.Manufacturer ?? ""),
  };
}

export function isSamsungAndroid(): boolean {
  if (Platform.OS !== "android") return false;
  const { brand, manufacturer } = androidBrandInfo();
  return /samsung/i.test(brand) || /samsung/i.test(manufacturer);
}

/** Extra bottom padding for gesture-nav Android / Samsung when inset is small. */
export function androidBottomBuffer(bottomSafeInset: number): number {
  if (Platform.OS !== "android") return 0;
  if (bottomSafeInset >= 20) return 0;
  const base = LAYOUT_OVERLAP.ANDROID_NAV_BAR_BUFFER;
  return isSamsungAndroid() ? base + LAYOUT_OVERLAP.SAMSUNG_TAB_BUFFER : base;
}

/** iOS KeyboardAvoidingView offset from screen top to a tab-screen chat panel. */
export function keyboardOffsetForTabScreen(topSafeInset: number, headerChromeHeight = 0): number {
  const base =
    topSafeInset +
    LAYOUT_OVERLAP.TOP_DISCLOSURE_CONTENT_HEIGHT +
    headerChromeHeight;
  return Platform.OS === "ios" ? base + 4 : base;
}

export function keyboardAvoidingBehavior(): "padding" | "height" | undefined {
  if (Platform.OS === "ios") return "padding";
  // Samsung / Pixel: padding avoids composer sitting under keyboard with adjustResize.
  return "padding";
}
