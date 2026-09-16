import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("Search UR suggestion tabs", () => {
  it("keeps kind chips and starter tabs white with bluish-purple lettering", () => {
    const panel = readFileSync("components/platform-search-panel.tsx", "utf8");
    expect(panel).toContain("styles.starter");
    expect(panel).toMatch(/styles\.starter[\s\S]{0,180}backgroundColor: colors\.surface/);
    expect(panel).toContain("color: colors.onWhite");
    expect(panel).not.toMatch(/styles\.starter[\s\S]{0,220}colors\.background/);
    expect(panel).not.toMatch(/backgroundColor: active \? `\$\{colors\.primary\}20` : colors\.background/);
  });
});
