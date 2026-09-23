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
    expect(LAYOUT_OVERLAP.TAB_BAR_CONTENT_HEIGHT).toBeLessThanOrEqual(32);
    expect(LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_ABOVE_TAB_HEIGHT).toBeLessThanOrEqual(16);
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

  it("pads the phone tab bar with one short bottom inset and no extra block", () => {
    expect(effectiveTabBarBottomInset(0)).toBe(LAYOUT_OVERLAP.WEB_TAB_BAR_BOTTOM_PAD);
    expect(effectiveTabBarBottomInset(0, 70)).toBe(LAYOUT_OVERLAP.WEB_TAB_BAR_BOTTOM_PAD);
    expect(effectiveTabBarBottomInset(40)).toBe(40);
    expect(tabBarTotalHeight(34)).toBeGreaterThan(tabBarIconsOnlyHeight());
    expect(LAYOUT_OVERLAP).not.toHaveProperty("WEB_TOUCH_BOTTOM_INSET");
    expect(LAYOUT_OVERLAP.TAB_BAR_HOME_CLEARANCE).toBe(0);
    expect(LAYOUT_OVERLAP.ANDROID_GESTURE_INSET).toBe(12);
    expect(LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET).toBe(12);
    const tabBar = readFileSync("components/tab-bar-with-disclosure.tsx", "utf8");
    const hook = readFileSync("hooks/use-tab-bar-bottom-inset.ts", "utf8");
    const css = readFileSync("global.css", "utf8");
    const tabsLayout = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    expect(tabBar).toContain("useTabBarBottomInset");
    expect(tabBar).toContain("paddingBottom: bottomPad");
    expect(tabBar).not.toContain('testID="tab-bar-os-clearance"');
    expect(tabBar).not.toContain("height: bottomPad");
    expect(tabBar).toContain('className: "ur-tab-bar-web"');
    expect(tabBar).not.toContain('Platform.OS === "web" ? 0');
    expect(tabBar).not.toContain("WEB_TAB_BAR_BOTTOM_PAD");
    expect(hook).toContain("effectiveTabBarBottomInset");
    expect(hook).toContain("insets.bottom");
    expect(LAYOUT_OVERLAP.WEB_TAB_BAR_BOTTOM_PAD).toBe(8);
    expect(css).toContain(".ur-tab-bar-web");
    expect(css).toContain("env(safe-area-inset-bottom");
    expect(css).not.toContain("+ 48px");
    expect(css).toMatch(/padding-bottom:\s*max\(8px/);
    const tabBarCss = css.match(/\.ur-tab-bar-web\s*\{[\s\S]*?\}/)?.[0] ?? "";
    expect(tabBarCss).toContain("padding-bottom");
    expect(tabBarCss).not.toContain("box-sizing: border-box");
    expect(css).not.toContain(".ur-tab-home-spacer");
    expect(css).not.toContain(".ur-phone-home-bar-clearance");
    expect(tabsLayout).toContain('position: "relative"');
    expect(tabsLayout).not.toContain(
      "safeAreaInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}",
    );
    expect(resolveTabBarBottomInset({ platform: "ios", safeBottom: 0 })).toBe(
      LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET,
    );
    expect(resolveTabBarBottomInset({ platform: "ios", safeBottom: 34 })).toBe(
      LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET,
    );
    expect(resolveTabBarBottomInset({ platform: "android", safeBottom: 0 })).toBe(
      LAYOUT_OVERLAP.ANDROID_GESTURE_INSET,
    );
    expect(resolveTabBarBottomInset({ platform: "android", safeBottom: 48 })).toBe(
      LAYOUT_OVERLAP.ANDROID_GESTURE_INSET,
    );
    expect(resolveTabBarBottomInset({ platform: "android", safeBottom: 80 })).toBe(
      LAYOUT_OVERLAP.ANDROID_GESTURE_INSET,
    );
    expect(resolveTabBarBottomInset({ platform: "web", safeBottom: 0 })).toBe(
      LAYOUT_OVERLAP.WEB_TAB_BAR_BOTTOM_PAD,
    );
    expect(
      resolveTabBarBottomInset({ platform: "web", safeBottom: 0, iosWeb: true }),
    ).toBe(LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET);
    expect(
      resolveTabBarBottomInset({ platform: "web", safeBottom: 0, androidWeb: true }),
    ).toBe(LAYOUT_OVERLAP.ANDROID_GESTURE_INSET);
    expect(
      resolveTabBarBottomInset({ platform: "web", safeBottom: 0, phoneWeb: true }),
    ).toBe(LAYOUT_OVERLAP.IOS_HOME_INDICATOR_INSET);
  });
});
