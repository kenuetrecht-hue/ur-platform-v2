import { describe, it, expect, beforeEach } from "vitest";
import { UR_WORLD_WALLET_PACKS, UR_WORLD_MAX_LICENSES_PER_USER } from "../lib/ur-world-economy";
import {
  applyUrWorldAdGuard,
  containsForbiddenUrWorldClaim,
  UR_WORLD_REFUSAL,
} from "../lib/ur-world-disclosures";
import { avatarLookFromUserId } from "../lib/ur-world-avatar";
import {
  nearestTalkDesk,
  nearestPlazaNearby,
  UR_WORLD_TALK_DESKS,
  UR_WORLD_STATIONS,
  UR_WORLD_SIGN_LINES,
  UR_WORLD_PALETTE,
  buildWorldTalkHref,
  buildWorldSitHref,
} from "../lib/ur-world-plaza";
import { UR_WORLD_PLAN_STATUS, UR_WORLD_STORK_SYSTEM_RULE } from "../lib/ur-world-future-plan";
import { UR_WORLD_LOOK_TIER, UR_WORLD_LOOK_UPGRADE_PLAN } from "../lib/ur-world-look-upgrade-plan";
import { UR_WORLD_TALK_BULK_LINE } from "../lib/ur-world-talk-upsell";
import { inferSectionFromOpsText } from "../lib/platform-section-flags";
import {
  UR_WORLD_COSMETIC_PACKS,
  UR_WORLD_COSMETIC_PRICING_NOTE,
  cosmeticPackChannel,
  loadoutFromPack,
} from "../lib/ur-world-cosmetics";
import {
  _resetUrWorldForTests,
  creditCityWallet,
  getUrWorldSnapshot,
  licensePlot,
} from "../server/_core/ur-world-service";
import {
  giftCosmeticPackToUserIdForTests,
  liveCosmeticPacks,
  purchaseCosmeticPack,
  tryApplyWorldDirectorCommand,
  wearCosmeticPack,
} from "../server/_core/ur-world-locker-service";
import { WORLD_DIRECTOR_AI_ID } from "../lib/owner-platform-ops-catalog";
import { buildPlatformOpsSystemPrompt, canChatWorldDirector } from "../server/_core/platform-ops-ai";

describe("UR World talk city", () => {
  beforeEach(() => _resetUrWorldForTests());

  it("never prices City Wallet packs at exactly $5 (in-app)", () => {
    expect(UR_WORLD_WALLET_PACKS.every((p) => p.priceCents !== 500)).toBe(true);
  });

  it("gives a stable avatar from the same account id", () => {
    const a = avatarLookFromUserId("user-42", "Ken");
    const b = avatarLookFromUserId("user-42", "Ken");
    expect(a).toEqual(b);
    expect(a.initial).toBe("K");
    expect(a.bodyHex).toMatch(/^#[0-9a-f]{6}$/);
    expect(a.silhouette).toBe("member");
    expect(a.title).toBeUndefined();
  });

  it("gives the platform owner a unique UR Sheriff look members cannot buy", async () => {
    const member = getUrWorldSnapshot("user-42", "Ken");
    const owner = getUrWorldSnapshot("owner-1", "Kenneth", true);
    expect(owner.avatar.title).toBe("UR Sheriff");
    expect(owner.avatar.silhouette).toBe("owner");
    expect(owner.avatar.bodyHex).not.toBe(member.avatar.bodyHex);
    expect(member.avatar.title).toBeUndefined();
    expect(owner.equipped.jacket?.mesh).toBe("shirt");
    expect(owner.equipped.pants?.mesh).toBe("jeans");
    expect(owner.equipped.boots?.mesh).toBe("sneakers");
    expect(owner.cosmeticCatalog.some((p) => p.id === "ur-sheriff")).toBe(false);
    expect(owner.cosmeticOwned.some((o) => o.packId === "ur-sheriff" && o.ownerOnly && !o.giftable)).toBe(true);
    expect(() =>
      purchaseCosmeticPack({ userId: "user-42", userEmail: "a@b.com", packId: "ur-sheriff" }),
    ).toThrow();
    expect(await tryApplyWorldDirectorCommand("SET OWNER TITLE Civic Host", { ownerUserId: "owner-1" })).toMatch(
      /Civic Host/,
    );
    expect(getUrWorldSnapshot("owner-1", "Kenneth", true).avatar.title).toBe("Civic Host");
    expect(
      await tryApplyWorldDirectorCommand(
        "MAKE OWNER OUTFIT weekend shirt #e7e0d4 jeans #2c3d5a shoes #f4f1ea",
        { ownerUserId: "owner-1" },
      ),
    ).toMatch(/owner-weekend/);
    expect(getUrWorldSnapshot("owner-1", "Kenneth", true).equipped.jacket?.colorHex).toBe("#e7e0d4");
    expect(await tryApplyWorldDirectorCommand("DRESS OWNER", { ownerUserId: "owner-1" })).toMatch(/ur-sheriff/);
    await expect(tryApplyWorldDirectorCommand("SET OWNER TITLE King", { ownerUserId: "owner-1" })).rejects.toThrow();
  });

  it("detects a trade desk when you walk up", () => {
    const desk = UR_WORLD_TALK_DESKS.find((d) => d.id === "trade")!;
    expect(nearestTalkDesk(desk.x, desk.z)?.id).toBe("trade");
    expect(nearestTalkDesk(0, 2)).toBeNull();
    expect(buildWorldTalkHref(desk).params.ai).toBe("ai-electrician-001");
  });

  it("picks fountain over the sit ring, and spawn is still empty", () => {
    const heart = nearestPlazaNearby(0, 8);
    expect(heart?.id).toBe("fountain");
    const bench = nearestPlazaNearby(4.5, 8);
    expect(bench?.kind).toBe("station");
    expect(bench?.id).toBe("sit");
    expect(nearestPlazaNearby(0, 2)).toBeNull();
    expect(nearestPlazaNearby(8, 30)?.id).toBe("garden");
    expect(nearestPlazaNearby(28, 14)?.id).toBe("bar");
    expect(nearestPlazaNearby(-28, 14)?.id).toBe("well");
    expect(buildWorldSitHref()).toBe("/(tabs)/messages");
    expect(UR_WORLD_STATIONS).toHaveLength(5);
    expect(UR_WORLD_SIGN_LINES.every((s) => s.text === "UR")).toBe(true);
    expect(UR_WORLD_PALETTE.neonBlue).toBe("#4F46E5");
    expect(UR_WORLD_PALETTE.neonPurple).toBe("#7C3AED");
  });

  it("blocks investment pitches but allows legal restatements", () => {
    expect(containsForbiddenUrWorldClaim("Invest in UR World plots for ROI")).toBe(true);
    expect(applyUrWorldAdGuard("Own digital land in UR World")).toBe(UR_WORLD_REFUSAL);
    expect(
      containsForbiddenUrWorldClaim(
        "UR World is entertainment and education only. A plot is a game license, not land, not an investment.",
      ),
    ).toBe(false);
  });

  it("caps plot licenses per account", () => {
    creditCityWallet({ userId: "u1", userEmail: "u1@test.com", packId: "wallet_100" });
    const snap = getUrWorldSnapshot("u1", "Sam");
    expect(snap.maxLicenses).toBe(UR_WORLD_MAX_LICENSES_PER_USER);
    expect(snap.avatar.initial).toBe("S");
    licensePlot({ userId: "u1", userEmail: "u1@test.com", plotId: snap.plots[0]!.id });
    expect(getUrWorldSnapshot("u1").licenseCount).toBe(1);
  });

  it("tells Stork the talk-city plan and bulk packs as time, not land", () => {
    expect(UR_WORLD_PLAN_STATUS.now.toLowerCase()).toContain("avatar");
    expect(UR_WORLD_PLAN_STATUS.now.toLowerCase()).toContain("locker");
    expect(UR_WORLD_PLAN_STATUS.never.toLowerCase()).toContain("crime");
    expect(UR_WORLD_PLAN_STATUS.later.toLowerCase()).toContain("tool wraps");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("firearm");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("loot box");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("gift");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("unused");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("resale");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("kyc");
    expect(UR_WORLD_TALK_BULK_LINE).toContain("$120");
    expect(UR_WORLD_TALK_BULK_LINE).toContain("$200");
    expect(UR_WORLD_TALK_BULK_LINE.toLowerCase()).not.toContain("own digital land");
    const steward = buildPlatformOpsSystemPrompt("platform-business-steward-ai");
    expect(steward).toContain("Stork");
    expect(steward).toContain("/world");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("Never");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("Plan B");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("glTF");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("$40");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("$3,000");
    expect(steward).toContain("Plan B");
    expect(steward).toContain("UPGRADE UR WORLD LOOK TO B");
  });

  it("keeps look upgrades queued until the owner has cash", () => {
    expect(UR_WORLD_LOOK_TIER).toBe("A");
    expect(UR_WORLD_LOOK_UPGRADE_PLAN.currentTier).toBe("A");
    expect(UR_WORLD_LOOK_UPGRADE_PLAN.tiers.B.status).toBe("queued");
    expect(UR_WORLD_LOOK_UPGRADE_PLAN.tiers.C.status).toBe("queued");
    expect(UR_WORLD_LOOK_UPGRADE_PLAN.tiers.D.status).toBe("queued-do-not-start");
    expect(UR_WORLD_LOOK_UPGRADE_PLAN.tiers.B.costUsd).toMatch(/40/);
    expect(UR_WORLD_LOOK_UPGRADE_PLAN.tiers.C.costUsd).toMatch(/3,000/);
    expect(UR_WORLD_LOOK_UPGRADE_PLAN.files.glbLoaderExample).toContain("SceneLoader");
    expect(UR_WORLD_PLAN_STATUS.now).toContain("Plan A");
    expect(UR_WORLD_PLAN_STATUS.now.toLowerCase()).toContain("avatar");
    expect(UR_WORLD_PLAN_STATUS.now.toLowerCase()).toContain("locker");
  });

  it("infers ur_world from ops chat", () => {
    expect(inferSectionFromOpsText("isolate UR World plaza")).toBe("ur_world");
    expect(inferSectionFromOpsText("talk city desks down")).toBe("ur_world");
  });

  it("ships ten apparel packs, never $5, all web checkout", () => {
    expect(UR_WORLD_COSMETIC_PACKS).toHaveLength(10);
    expect(UR_WORLD_COSMETIC_PRICING_NOTE.toLowerCase()).toContain("never exactly $5");
    for (const pack of UR_WORLD_COSMETIC_PACKS) {
      expect(pack.priceCents).not.toBe(500);
      expect(pack.priceCents).toBeGreaterThanOrEqual(199);
      expect(pack.priceCents).toBeLessThanOrEqual(499);
      expect(pack.pieces).toHaveLength(4);
      expect(cosmeticPackChannel(pack.priceCents)).toBe("web_browser");
      const loadout = loadoutFromPack(pack);
      expect(Object.keys(loadout)).toEqual(expect.arrayContaining(["hat", "jacket", "boots", "accent"]));
    }
  });

  it("lets you gift unused apparel, and blocks gift after you wear it", () => {
    const worn = purchaseCosmeticPack({
      userId: "ken",
      userEmail: "ken@example.com",
      packId: "civic-dawn",
    });
    wearCosmeticPack({ userId: "ken", instanceId: worn.instanceId });
    expect(() =>
      giftCosmeticPackToUserIdForTests({
        fromUserId: "ken",
        instanceId: worn.instanceId,
        toUserId: "friend",
      }),
    ).toThrow();

    const unused = purchaseCosmeticPack({
      userId: "ken",
      userEmail: "ken@example.com",
      packId: "night-shift",
    });
    giftCosmeticPackToUserIdForTests({
      fromUserId: "ken",
      instanceId: unused.instanceId,
      toUserId: "friend",
    });
    const friend = getUrWorldSnapshot("friend");
    expect(friend.cosmeticOwned.some((o) => o.packId === "night-shift" && o.giftable)).toBe(true);
    expect(getUrWorldSnapshot("ken").cosmeticOwned.some((o) => o.instanceId === unused.instanceId)).toBe(
      false,
    );
  });

  it("lets World Director retarget a pack price and pause a pack", async () => {
    expect(canChatWorldDirector({ isPlatformOwner: true })).toBe(true);
    expect(canChatWorldDirector({ isPlatformOwner: false })).toBe(false);
    const director = buildPlatformOpsSystemPrompt(WORLD_DIRECTOR_AI_ID);
    expect(director).toContain("Civic Dawn");
    expect(director).toContain("SET WORLD PACK PRICE");
    expect(director).toContain("DRESS OWNER");
    expect(director).toContain("MAKE OWNER OUTFIT");
    expect(director).toContain("REACTIVATE WORLD USER");
    expect(director).toContain("DISCONTINUE WORLD USER");
    expect(director).toContain("Plan A");
    expect(director).toContain("SET NEXT LOOK SCENE");
    expect(await tryApplyWorldDirectorCommand("SET WORLD PACK PRICE civic-dawn 2.49")).toMatch(/2\.49/);
    expect(liveCosmeticPacks().find((p) => p.id === "civic-dawn")?.priceCents).toBe(249);
    expect(await tryApplyWorldDirectorCommand("PAUSE WORLD PACK night-shift")).toMatch(/night-shift/i);
    expect(liveCosmeticPacks().some((p) => p.id === "night-shift")).toBe(false);
    await expect(tryApplyWorldDirectorCommand("SET WORLD PACK PRICE civic-dawn 5.00")).rejects.toThrow();
  });
});
