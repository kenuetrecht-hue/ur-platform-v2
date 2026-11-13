import { describe, expect, it } from "vitest";
import { SANDBOX_LAYER_PRICE_USD } from "../lib/sandbox-layers";
import { isMemberBuildRequest, memberBuildKind, starterFilesFor } from "../lib/member-builder";
import { SANDBOX_TIERS } from "../server/_core/coder-sandbox-service";
import { GAME_SANDBOX_TIERS } from "../server/_core/game-dev-sandbox-service";
import { saveMemberBuild } from "../server/_core/member-builder-service";
import { getCreativeSelfPacedPath } from "../server/_core/creative-arts-teaching-curriculum";

describe("sandbox layers", () => {
  it("sells three sizes at 0, 9.99, and 24.99", () => {
    expect(SANDBOX_LAYER_PRICE_USD).toEqual({ small: 0, medium: 9.99, large: 24.99 });
    expect(SANDBOX_TIERS.starter.upgradePriceUsd).toBeNull();
    expect(SANDBOX_TIERS.builder.upgradePriceUsd).toBe(9.99);
    expect(SANDBOX_TIERS.studio.upgradePriceUsd).toBe(24.99);
    expect(SANDBOX_TIERS.enterprise.upgradePriceUsd).toBeNull();
    expect(GAME_SANDBOX_TIERS.builder.upgradePriceUsd).toBe(9.99);
    expect(GAME_SANDBOX_TIERS.studio.upgradePriceUsd).toBe(24.99);
    expect(GAME_SANDBOX_TIERS.enterprise.upgradePriceUsd).toBeNull();
  });

  it("gives Large more room than Medium", () => {
    expect(SANDBOX_TIERS.studio.maxFilesPerProject).toBeGreaterThan(SANDBOX_TIERS.builder.maxFilesPerProject);
    expect(SANDBOX_TIERS.studio.storageBytes).toBeGreaterThan(SANDBOX_TIERS.builder.storageBytes);
    expect(GAME_SANDBOX_TIERS.studio.storageBytes).toBeGreaterThan(GAME_SANDBOX_TIERS.builder.storageBytes);
    expect(SANDBOX_TIERS.studio.maxFilesPerProject).toBeGreaterThanOrEqual(8000);
    expect(GAME_SANDBOX_TIERS.studio.maxFilesPerProject).toBeGreaterThanOrEqual(12000);
  });
});

describe("member builders", () => {
  it("detects a website, logo, game, and teaching chain request", () => {
    expect(memberBuildKind("ai-coder-001", "build me a website")).toBe("website");
    expect(memberBuildKind("ai-coder-001", "design a logo")).toBe("logo");
    expect(memberBuildKind("ai-game-dev-001", "make a game")).toBe("game");
    expect(memberBuildKind("ai-blockchain-001", "build a blockchain")).toBe("chain");
    expect(isMemberBuildRequest("hello")).toBe(false);
  });

  it("starts a website, an original logo, and a teaching chain", () => {
    expect(starterFilesFor("website").map((file) => file.path)).toEqual([
      "index.html",
      "styles.css",
      "main.js",
    ]);
    const logo = starterFilesFor("logo").find((file) => file.path === "logo.svg")?.content ?? "";
    expect(logo).not.toMatch(/<script/i);
    const chain = starterFilesFor("chain").map((file) => file.content).join("\n");
    expect(chain).toMatch(/No real money/i);
  });

  it("saves a website into the code sandbox", async () => {
    const saved = await saveMemberBuild({
      creatorId: "ai-coder-001",
      message: "build me a website",
      userId: "sandbox-layer-web",
      isPlatformOwner: false,
    });
    expect(saved?.paths).toContain("index.html");
    expect(saved?.note).toMatch(/did not change urplatform/i);
  });

  it("gives Logo & Brand a self-paced path", () => {
    expect(getCreativeSelfPacedPath("ai-logo-brand-001", "beginner").length).toBeGreaterThan(0);
  });
});
