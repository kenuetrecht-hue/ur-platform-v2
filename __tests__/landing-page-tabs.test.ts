import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("welcome page tabs", () => {
  const welcome = readFileSync("components/techno-futurist-experience.tsx", "utf8");

  it("splits the join page into tabs instead of one long scroll", () => {
    expect(welcome).toContain("testID={`landing-page-tab-${tab.id}`}");
    for (const id of ["signup", "login", "offers", "ais", "examples", "community", "price", "download"]) {
      expect(welcome).toContain(`{ id: "${id}"`);
      expect(welcome).toContain(`pageTab === "${id}"`);
    }
  });

  it("keeps the download buttons off the example cards", () => {
    const examples = welcome.slice(
      welcome.indexOf('pageTab === "examples"'),
      welcome.indexOf('pageTab === "community"'),
    );
    const download = welcome.slice(
      welcome.indexOf('pageTab === "download" ?'),
      welcome.indexOf("styles.footer"),
    );
    expect(examples).toContain("LandingBentoGrid");
    expect(examples).not.toContain("LandingDeviceDownloadLinks");
    expect(download).toContain("LandingDeviceDownloadLinks");
    expect(download).not.toContain("LandingBentoGrid");
  });
});
