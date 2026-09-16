import { Platform } from "react-native";

/**
 * Overlap protocol — keep chat composers and scroll content clear of:
 * - iOS home indicator / Dynamic Island safe areas
 * - Android gesture nav & Samsung One UI nav bars
 * - Expo bottom tab bar (see app/(tabs)/_layout.tsx)
 * - Platform disclosure bars (PlatformDisclosureFrame)
 */
export const LAYOUT_OVERLAP = {
  TAB_BAR_CONTENT_HEIGHT: 52,
  TAB_BAR_TOP_PADDING: 4,
  /** Floor when the OS reports no inset (desktop web). */
  TAB_BAR_MIN_BOTTOM_INSET: 0,
  /** iPhone / iPad home indicator when native inset is missing. */
  IOS_HOME_INDICATOR_INSET: 34,
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
  /** Native Android / Android-web floor for the system navigation bar. */
  ANDROID_GESTURE_INSET: 64,
  /** Extra gap above the OS bar. Keep at 0 — a second block eats screen. */
  TAB_BAR_HOME_CLEARANCE: 0,
  /** Desktop-web floor when there is no home indicator. Phone web uses the OS inset instead. */
  WEB_TAB_BAR_BOTTOM_PAD: 20,
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

export function measureWebBottomOcclusion(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

export function isIosWebRuntime(): boolean {
  if (Platform.OS === "ios") return true;
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAndroidWebRuntime(): boolean {
  if (Platform.OS === "android") return true;
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isStandaloneWebApp(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia?.("(display-mode: standalone)");
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return Boolean(media?.matches || iosStandalone);
}

export function isPhoneWebRuntime(): boolean {
  if (isIosWebRuntime() || isAndroidWebRuntime()) return true;
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  if (isStandaloneWebApp()) return true;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const narrow = window.innerWidth < 900;
  return Boolean(coarse && narrow);
}

/**
 * Bottom pad for the real tab bar.
 * Android: one 64px OS-bar floor. Do not add 48px clearance or a second spacer.
 */
export function resolveTabBarBottomInset(args: {
  safeBottom: number;
  cssSafeBottom?: number;
  platform: string;
  iosWeb?: boolean;
  androidWeb?: boolean;
  phoneWeb?: boolean;
}): number {
  const os = Math.max(0, args.safeBottom, args.cssSafeBottom ?? 0);
  const ios = args.platform === "ios" || Boolean(args.iosWeb);
  const android = args.platform === "android" || Boolean(args.androidWeb);
  const phone = ios || android || Boolean(args.phoneWeb);
  if (ios) {
    return Math.max(os, LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET);
  }
  if (android) {
    return Math.max(os, LAYOUT_OVERLAP.ANDROID_GESTURE_INSET);
  }
  if (phone) {
    return os > 0 ? os : LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET;
  }
  return Math.max(
    os,
    LAYOUT_OVERLAP.TAB_BAR_MIN_BOTTOM_INSET,
    LAYOUT_OVERLAP.WEB_TAB_BAR_BOTTOM_PAD,
  );
}

/** Home-indicator padding inside the real tab bar. Do not invent a second toolbar. */
export function effectiveTabBarBottomInset(safeBottom: number, _occlusion = 0): number {
  const css = Platform.OS === "web" ? readCssSafeAreaBottom() : 0;
  return resolveTabBarBottomInset({
    safeBottom,
    cssSafeBottom: css,
    platform: Platform.OS,
    iosWeb: isIosWebRuntime(),
    androidWeb: isAndroidWebRuntime(),
    phoneWeb: isPhoneWebRuntime(),
  });
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
