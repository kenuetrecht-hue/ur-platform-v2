import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  HOME_HUB_TABS,
  HOME_MAIN_DOORS,
  HOME_STUDIO_DOORS,
  isHomeHubTabId,
} from "../lib/home-hub";

describe("home hub", () => {
  it("keeps the Social-style tabs and doors on website and app", () => {
    expect(HOME_HUB_TABS.map((tab) => tab.id)).toEqual([
      "start",
      "daily",
      "board",
      "studios",
      "doors",
    ]);
    expect(isHomeHubTabId("studios")).toBe(true);
    expect(isHomeHubTabId("scroll")).toBe(false);
    expect(HOME_STUDIO_DOORS.some((door) => door.id === "world")).toBe(true);
    expect(HOME_MAIN_DOORS.some((door) => door.label === "AIs")).toBe(true);

    const home = readFileSync("app/(tabs)/index.tsx", "utf8");
    const create = readFileSync("app/(tabs)/create.tsx", "utf8");
    const discover = readFileSync("app/(tabs)/discover.tsx", "utf8");
    const profile = readFileSync("app/(tabs)/profile.tsx", "utf8");
    const social = readFileSync("components/social-hub-tab-bar.tsx", "utf8");
    expect(home).toContain("HubTabBar");
    expect(home).toContain("PasswordRemindBanner");
    expect(home).toContain("DailyLoyaltyBanner");
    expect(home).toContain("AiFreeBoardPanel");
    expect(home).toContain('hubTab === "daily"');
    expect(home).toContain('hubTab === "board"');
    expect(home).toContain("isPlatformOwner");
    expect(home).not.toContain("canAccessAdminDashboard");
    expect(home).not.toContain("Walk your avatar through the night plaza");
    expect(create).toContain("HubTabBar");
    expect(create).not.toContain("Start a new");
    expect(discover).toContain("HubTabBar");
    expect(profile).toContain("HubTabBar");
    expect(profile).not.toContain('label="Admin"');
    expect(profile).not.toContain('label="Business Steward"');
    expect(social).toContain("HubTabBar");

    const screen = readFileSync("components/screen-container.tsx", "utf8");
    const login = readFileSync("components/auth-door-stage.tsx", "utf8");
    expect(screen).toContain("BrandColorStage");
    expect(login).toContain("BrandColorStage");

    const tabs = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    expect(tabs).toContain("href: null");
    expect(tabs).not.toContain("canAccessAdminDashboard");
  });
});
