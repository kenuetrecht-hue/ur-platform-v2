import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import themeConfig from "../theme.config";

describe("lettering on white vs colored backgrounds", () => {
  it("keeps gold on colored backgrounds and bluish-purple on white", () => {
    expect(themeConfig.themeColors.foreground.light).toBe("#FFD700");
    expect(themeConfig.themeColors.foreground.dark).toBe("#FFD700");
    expect(themeConfig.themeColors.gold.light).toBe("#FFD700");
    expect(themeConfig.themeColors.onWhite.light).toBe("#4F46E5");
    expect(themeConfig.themeColors.onWhite.dark).toBe("#FFD700");

    const lettering = readFileSync("lib/gold-lettering.ts", "utf8");
    expect(lettering).toContain('LETTERING_ON_WHITE = "#4F46E5"');
    expect(lettering).toContain('LETTERING_ON_COLOR = "#FFD700"');
    expect(lettering).toContain("applyDefaultLettering(LETTERING_ON_COLOR)");

    const css = readFileSync("global.css", "utf8");
    expect(css).toContain("--color-foreground: #ffd700");
    expect(css).toContain("--color-onWhite: #4f46e5");
    expect(css).toContain("--color-gold: #ffd700");

    const provider = readFileSync("lib/theme-provider.tsx", "utf8");
    expect(provider).toContain("LETTERING_ON_COLOR");
    expect(provider).not.toContain("LETTERING_ON_WHITE");

    const header = readFileSync("components/tab-screen-header.tsx", "utf8");
    expect(header).toContain("colors.gold");
    expect(header).not.toMatch(/backText.*colors\.primary/);

    const back = readFileSync("components/page-back-button.tsx", "utf8");
    expect(back).toContain("colors.gold");
    expect(back).not.toContain("colors.primary");

    const tiles = readFileSync("components/hub-door-tile.tsx", "utf8");
    expect(tiles).toContain("colors.onWhite");

    const launch = readFileSync("components/home-launch-promo-banner.tsx", "utf8");
    expect(launch).toContain("Launch window closed");
    expect(launch).toContain("colors.onWhite");
    expect(launch).not.toMatch(/Launch window closed[\s\S]{0,80}colors\.foreground/);

    const tabs = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    expect(tabs).toContain("colors.onWhite");

    const landing = readFileSync("lib/landing-theme.ts", "utf8");
    expect(landing).toContain('text: "#FFD700"');
  });
});
