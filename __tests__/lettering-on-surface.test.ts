import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import themeConfig from "../theme.config";

const ON_WHITE = "#4F46E5";
const ON_COLOR = "#FFD700";
const MUTED_ON_WHITE = "#6D28D9";

describe("lettering on white vs colored backgrounds", () => {
  it("uses bluish-purple body ink on white, and keeps gold for colored wash", () => {
    expect(themeConfig.themeColors.foreground.light).toBe(ON_WHITE);
    expect(themeConfig.themeColors.muted.light).toBe(MUTED_ON_WHITE);
    expect(themeConfig.themeColors.onWhite.light).toBe(ON_WHITE);
    expect(themeConfig.themeColors.gold.light).toBe(ON_COLOR);
    expect(themeConfig.themeColors.foreground.dark).toBe(ON_COLOR);
    expect(themeConfig.themeColors.onWhite.dark).toBe(ON_COLOR);

    const lettering = readFileSync("lib/gold-lettering.ts", "utf8");
    expect(lettering).toContain(`LETTERING_ON_WHITE = "${ON_WHITE}"`);
    expect(lettering).toContain(`LETTERING_ON_COLOR = "${ON_COLOR}"`);
    expect(lettering).toContain("applyDefaultLettering(LETTERING_ON_WHITE)");

    const css = readFileSync("global.css", "utf8");
    expect(css).toContain("color: #4f46e5");
    expect(css).toContain("--color-foreground: #4f46e5");
    expect(css).toContain("--color-muted: #6d28d9");
    expect(css).toContain("--color-onWhite: #4f46e5");
    expect(css).toContain("--color-gold: #ffd700");

    const provider = readFileSync("lib/theme-provider.tsx", "utf8");
    expect(provider).toContain("LETTERING_ON_WHITE");
    expect(provider).toContain("LETTERING_ON_COLOR");
    expect(provider).toContain('scheme === "light" ? LETTERING_ON_WHITE : LETTERING_ON_COLOR');

    const header = readFileSync("components/tab-screen-header.tsx", "utf8");
    expect(header).toContain("colors.gold");
    expect(header).not.toMatch(/backText.*colors\.primary/);

    const back = readFileSync("components/page-back-button.tsx", "utf8");
    expect(back).toContain("colors.gold");
    expect(back).not.toContain("colors.primary");

    const hubTabs = readFileSync("components/hub-tab-bar.tsx", "utf8");
    expect(hubTabs).toContain("colors.gold");

    const disclosure = readFileSync("components/platform-disclosure-bar.tsx", "utf8");
    expect(disclosure).toContain("colors.gold");

    const tiles = readFileSync("components/hub-door-tile.tsx", "utf8");
    expect(tiles).toContain("colors.onWhite");

    const launch = readFileSync("components/home-launch-promo-banner.tsx", "utf8");
    expect(launch).toContain("Launch window closed");
    expect(launch).toContain("colors.onWhite");
    expect(launch).not.toMatch(/Launch window closed[\s\S]{0,80}colors\.foreground/);

    const tabs = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    expect(tabs).toContain("colors.onWhite");

    const landing = readFileSync("lib/landing-theme.ts", "utf8");
    expect(landing).toContain(`text: "${ON_COLOR}"`);
  });

  it("keeps Social, Profile, AIs, and Administration white-card copy on the purple token", () => {
    const social = readFileSync("components/social-feed-panel.tsx", "utf8");
    expect(social).toContain("Hide composer");
    expect(social).toMatch(/composerInput[\s\S]{0,80}colors\.foreground/);

    const profile = readFileSync("app/(tabs)/profile.tsx", "utf8");
    expect(profile).toContain("color: colors.foreground");
    expect(profile).toContain("colors.primary");

    const personalAi = readFileSync("components/personal-ai-interface.tsx", "utf8");
    expect(personalAi).toContain("Hi! I'm ContentMate");
    expect(personalAi).toMatch(/color: msg\.role === "user" \? "#fff" : colors\.foreground/);

    const usage = readFileSync("components/usage-allowance-banner.tsx", "utf8");
    expect(usage).toContain("Platform access active");
    expect(usage).toContain("color: colors.foreground");
    expect(usage).toContain("color: colors.muted");

    const creatorPanel = readFileSync("components/ai-creator-panel.tsx", "utf8");
    expect(creatorPanel).toContain("Learn the trade");
    expect(creatorPanel).toContain("active ? \"#fff\" : colors.foreground");

    const pricing = readFileSync("components/ai-specialist-pricing-panel.tsx", "utf8");
    expect(pricing).toContain("color: colors.foreground");
    expect(pricing).toContain("color: colors.muted");

    const ops = readFileSync("components/platform-ops-console.tsx", "utf8");
    expect(ops).toContain("📚 Learn");
    expect(ops).toContain("📌 Assign");
    expect(ops).toContain("active ? \"#fff\" : colors.foreground");

    const emanual = readFileSync("app/e-manual.tsx", "utf8");
    expect(emanual).toContain("color: colors.foreground");
  });
});
