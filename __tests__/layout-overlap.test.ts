import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web", constants: {} },
}));

import {
  LAYOUT_OVERLAP,
  bottomTabChromeHeight,
  composerDockPadding,
  effectiveTabBarBottomInset,
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

  it("keeps a floor under the tab labels when the phone reports no inset", () => {
    expect(effectiveTabBarBottomInset(0)).toBeGreaterThanOrEqual(
      LAYOUT_OVERLAP.TAB_BAR_MIN_BOTTOM_INSET,
    );
    expect(effectiveTabBarBottomInset(40)).toBe(40);
    expect(tabBarTotalHeight(0)).toBeGreaterThan(tabBarIconsOnlyHeight());
  });
});
