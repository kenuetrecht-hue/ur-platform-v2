import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import themeConfig from "../theme.config";

describe("lettering on white vs colored backgrounds", () => {
  it("uses platform bluish-purple on white surfaces and keeps gold on color", () => {
    expect(themeConfig.themeColors.foreground.light).toBe("#4F46E5");
    expect(themeConfig.themeColors.muted.light).toBe("#6D28D9");
    expect(themeConfig.themeColors.foreground.dark).toBe("#FFD700");
    expect(themeConfig.themeColors.gold.light).toBe("#FFD700");
    expect(themeConfig.themeColors.gold.dark).toBe("#FFD700");

    const lettering = readFileSync("lib/gold-lettering.ts", "utf8");
    expect(lettering).toContain('LETTERING_ON_WHITE = "#4F46E5"');
    expect(lettering).toContain('LETTERING_ON_COLOR = "#FFD700"');

    const css = readFileSync("global.css", "utf8");
    expect(css).toContain("--color-foreground: #4f46e5");
    expect(css).toContain("--color-gold: #ffd700");

    const tiles = readFileSync("components/hub-door-tile.tsx", "utf8");
    expect(tiles).toContain("colors.foreground");
    expect(tiles).not.toContain("colors.gold");

    const header = readFileSync("components/tab-screen-header.tsx", "utf8");
    expect(header).toContain("colors.gold");

    const landing = readFileSync("lib/landing-theme.ts", "utf8");
    expect(landing).toContain('text: "#FFD700"');

    const provider = readFileSync("lib/theme-provider.tsx", "utf8");
    expect(provider).toContain("LETTERING_ON_WHITE");
    expect(provider).toContain("LETTERING_ON_COLOR");
  });
});
