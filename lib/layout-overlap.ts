import { Platform } from "react-native";

/**
 * Overlap protocol — keep chat composers and scroll content clear of:
 * - iOS home indicator / Dynamic Island safe areas
 * - Android gesture nav & Samsung One UI nav bars
 * - Expo bottom tab bar (see app/(tabs)/_layout.tsx)
 * - Platform disclosure bars (PlatformDisclosureFrame)
 */
export const LAYOUT_OVERLAP = {
  TAB_BAR_CONTENT_HEIGHT: 42,
  TAB_BAR_TOP_PADDING: 2,
  /** Floor when the OS reports no inset (web, some Androids). */
  TAB_BAR_MIN_BOTTOM_INSET: 20,
  /** iPhone / iPad home indicator. */
  IOS_HOME_INDICATOR_INSET: 34,
  /** Touch phones/tablets in Safari when CSS safe-area is still 0. */
  WEB_TOUCH_BOTTOM_INSET: 34,
  /** PlatformDisclosureBar content below status inset (top bar). */
  TOP_DISCLOSURE_CONTENT_HEIGHT: 28,
  /** PlatformDisclosureBar content above home indicator (bottom bar on non-tab screens). */
  BOTTOM_DISCLOSURE_CONTENT_HEIGHT: 28,
  /** Compact disclosure row above tab bar (1 line + padding). */
  BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT: 26,
  COMPOSER_MIN_PADDING: 8,
  /** Gap so the compose card does not kiss the tab / legal strip. */
  COMPOSER_DOCK_GAP: 10,
  /** Extra when Android reports 0 bottom inset (common on Samsung gesture nav). */
  ANDROID_NAV_BAR_BUFFER: 6,
  /** Samsung One UI often needs a hair more clearance above the tab bar. */
  SAMSUNG_TAB_BUFFER: 4,
  /** AIs tab chrome above the chat panel (header + mode row + specialist bar). */
  AIS_TAB_CHROME_HEIGHT: 112,
} as const;

/** Legal disclaimer strip height when stacked directly above the tab bar. */
export function bottomDisclaimerAboveTabHeight(): number {
  return LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT;
}

/** Icon + label row only — home-bar clearance sits under this, not inside it. */
export function tabBarIconsOnlyHeight(): number {
  return LAYOUT_OVERLAP.TAB_BAR_CONTENT_HEIGHT + LAYOUT_OVERLAP.TAB_BAR_TOP_PADDING;
}

/** @deprecated Use tabBarIconsOnlyHeight — kept so older calls still compile. */
export function tabBarIconRowHeight(_bottomSafeInset?: number): number {
  return tabBarIconsOnlyHeight();
}

/** Total bottom chrome on tab screens: disclaimer + tab bar + home-indicator inset. */
export function bottomTabChromeHeight(bottomSafeInset: number): number {
  return bottomDisclaimerAboveTabHeight() + tabBarTotalHeight(bottomSafeInset);
}

/**
 * Extra padding under a compose box so it stays in the page, not on the footer.
 * Tab screens: add the legal strip only when the navigator reported the icon row alone.
 * Stack screens: always clear the bottom legal bar.
 */
export function composerDockPadding(args: {
  reserveTabBar: boolean;
  reportedTabBarHeight: number;
  bottomSafeInset: number;
  androidBuffer?: number;
}): number {
  const visual = LAYOUT_OVERLAP.COMPOSER_MIN_PADDING + LAYOUT_OVERLAP.COMPOSER_DOCK_GAP;
  const android = args.androidBuffer ?? androidBottomBuffer(args.bottomSafeInset);
  if (!args.reserveTabBar) {
    return visual + android + LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_CONTENT_HEIGHT;
  }
  const iconRow = tabBarTotalHeight(args.bottomSafeInset);
  const reported = args.reportedTabBarHeight;
  const missingDisclosure =
    reported > 0 && reported <= iconRow + 4 ? LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT : 0;
  return visual + android + missingDisclosure;
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function readCssSafeAreaBottom(): number {
  if (typeof document === "undefined") return 0;
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--ur-safe-bottom")
      .trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Space under the tab labels so they sit above the phone home bar / Safari toolbar. */
export function effectiveTabBarBottomInset(safeBottom: number): number {
  const css = Platform.OS === "web" ? readCssSafeAreaBottom() : 0;
  const platformFloor =
    Platform.OS === "ios"
      ? LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET
      : Platform.OS === "web" && isCoarsePointer()
        ? LAYOUT_OVERLAP.WEB_TOUCH_BOTTOM_INSET
        : LAYOUT_OVERLAP.TAB_BAR_MIN_BOTTOM_INSET;
  return Math.max(safeBottom, css, platformFloor);
}

export function tabBarTotalHeight(bottomSafeInset: number): number {
  return tabBarIconsOnlyHeight() + effectiveTabBarBottomInset(bottomSafeInset);
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
