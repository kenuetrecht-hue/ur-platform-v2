import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { DASHBOARD_SIDEBAR_BREAKPOINT, DASHBOARD_SIDEBAR_WIDTH, isWideDashboard } from "../lib/dashboard-layout";

describe("dashboard layout", () => {
  it("keeps phone tabs on the bottom and moves wide web to a left sidebar", () => {
    expect(isWideDashboard(390, "web")).toBe(false);
    expect(isWideDashboard(DASHBOARD_SIDEBAR_BREAKPOINT - 1, "web")).toBe(false);
    expect(isWideDashboard(DASHBOARD_SIDEBAR_BREAKPOINT, "web")).toBe(true);
    expect(isWideDashboard(1440, "ios")).toBe(false);
    expect(isWideDashboard(1440, "android")).toBe(false);
    expect(DASHBOARD_SIDEBAR_WIDTH).toBeGreaterThan(160);

    const layout = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    const bar = readFileSync("components/tab-bar-with-disclosure.tsx", "utf8");
    const pills = readFileSync("components/hub-tab-bar.tsx", "utf8");
    const scroll = readFileSync("components/tab-page-scroll.tsx", "utf8");
    const ais = readFileSync("app/(tabs)/ais.tsx", "utf8");

    expect(layout).toContain('tabBarPosition: wide ? "left" : "bottom"');
    expect(bar).toContain("DesktopTabSidebar");
    expect(bar).toContain("useTabBarBottomInset");
    expect(pills).toContain("horizontal");
    expect(pills).toContain("colors.gold");
    expect(scroll).toContain("FloatingCard");
    expect(scroll).toContain("ScrollView");
    expect(ais).not.toContain("maxHeight: 260");
    expect(ais).toContain("pageScroll={false}");
    expect(readFileSync("components/composer-dock.tsx", "utf8")).toContain("KeyboardAvoidingView");
  });
});
