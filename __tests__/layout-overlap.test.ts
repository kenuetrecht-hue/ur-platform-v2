import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";

vi.mock("react-native", () => ({
  Platform: { OS: "web", constants: {} },
}));

import {
  LAYOUT_OVERLAP,
  bottomTabChromeHeight,
  composerDockPadding,
  effectiveTabBarBottomInset,
  resolveTabBarBottomInset,
  tabBarIconsOnlyHeight,
  tabBarTotalHeight,
} from "../lib/layout-overlap";

describe("layout-overlap", () => {
  it("keeps the tab row and AI warning strip compact so the page scroll is taller", () => {
    expect(LAYOUT_OVERLAP.TAB_BAR_CONTENT_HEIGHT).toBeLessThanOrEqual(44);
    expect(LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT).toBeLessThanOrEqual(28);
  });

  it("counts the legal strip plus the icon row as tab chrome", () => {
    const inset = 0;
    expect(bottomTabChromeHeight(inset)).toBe(
      LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT + tabBarTotalHeight(inset),
    );
  });

  it("lifts the compose box above the stack-screen legal bar", () => {
    const padding = composerDockPadding({
      reserveTabBar: false,
      reportedTabBarHeight: 0,
      bottomSafeInset: 0,
    });
    expect(padding).toBeGreaterThanOrEqual(
      LAYOUT_OVERLAP.COMPOSER_MIN_PADDING +
        LAYOUT_OVERLAP.COMPOSER_DOCK_GAP +
        LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_CONTENT_HEIGHT,
    );
  });

  it("adds the missing legal strip when the navigator only reported the icon row", () => {
    const inset = 8;
    const iconRow = tabBarTotalHeight(inset);
    const padding = composerDockPadding({
      reserveTabBar: true,
      reportedTabBarHeight: iconRow,
      bottomSafeInset: inset,
    });
    expect(padding).toBeGreaterThanOrEqual(LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT);
  });

  it("does not double-count chrome when the full dock height is already reported", () => {
    const inset = 8;
    const full = bottomTabChromeHeight(inset);
    const padding = composerDockPadding({
      reserveTabBar: true,
      reportedTabBarHeight: full,
      bottomSafeInset: inset,
    });
    expect(padding).toBeLessThan(LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT + 24);
  });

  it("pads the real tab bar with the home indicator, not a second toolbar", () => {
    expect(effectiveTabBarBottomInset(0)).toBe(0);
    expect(effectiveTabBarBottomInset(0, 70)).toBe(0);
    expect(effectiveTabBarBottomInset(40)).toBe(40);
    expect(tabBarTotalHeight(34)).toBeGreaterThan(tabBarIconsOnlyHeight());
    expect(LAYOUT_OVERLAP).not.toHaveProperty("WEB_TOUCH_BOTTOM_INSET");
    const tabBar = readFileSync("components/tab-bar-with-disclosure.tsx", "utf8");
    expect(tabBar).toContain('useSafeAreaInsets');
    expect(tabBar).toContain("paddingBottom: bottomPad");
    expect(tabBar).toContain("react-native-safe-area-context");
    expect(tabBar).not.toContain("ur-phone-home-bar-clearance");
    expect(tabBar).not.toContain("ur-tab-home-spacer");
    expect(tabBar).not.toContain("ur-tab-dock");
    expect(tabBar).not.toContain('Platform.OS === "web" ? 0');
    expect(readFileSync("app/(tabs)/_layout.tsx", "utf8")).toContain('position: "relative"');
    expect(readFileSync("app/(tabs)/_layout.tsx", "utf8")).toContain(
      "safeAreaInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}",
    );
    expect(readFileSync("global.css", "utf8")).not.toContain(".ur-tab-home-spacer");
    expect(resolveTabBarBottomInset({ platform: "ios", safeBottom: 0 })).toBe(
      LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET + LAYOUT_OVERLAP.TAB_BAR_HOME_CLEARANCE,
    );
    expect(resolveTabBarBottomInset({ platform: "ios", safeBottom: 34 })).toBe(
      LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET + LAYOUT_OVERLAP.TAB_BAR_HOME_CLEARANCE,
    );
    expect(resolveTabBarBottomInset({ platform: "android", safeBottom: 0 })).toBe(
      LAYOUT_OVERLAP.ANDROID_GESTURE_INSET + LAYOUT_OVERLAP.TAB_BAR_HOME_CLEARANCE,
    );
    expect(resolveTabBarBottomInset({ platform: "android", safeBottom: 48 })).toBe(
      48 + LAYOUT_OVERLAP.TAB_BAR_HOME_CLEARANCE,
    );
  });
});
