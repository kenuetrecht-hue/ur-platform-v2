import { describe, it, expect, beforeEach } from "vitest";
import { UR_WORLD_WALLET_PACKS, UR_WORLD_MAX_LICENSES_PER_USER } from "../lib/ur-world-economy";
import {
  applyUrWorldAdGuard,
  containsForbiddenUrWorldClaim,
  UR_WORLD_REFUSAL,
} from "../lib/ur-world-disclosures";
import { avatarLookFromUserId } from "../lib/ur-world-avatar";
import { nearestTalkDesk, UR_WORLD_TALK_DESKS, buildWorldTalkHref } from "../lib/ur-world-plaza";
import { UR_WORLD_PLAN_STATUS, UR_WORLD_STORK_SYSTEM_RULE } from "../lib/ur-world-future-plan";
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
  });

  it("detects a trade desk when you walk up", () => {
    const desk = UR_WORLD_TALK_DESKS.find((d) => d.id === "trade")!;
    expect(nearestTalkDesk(desk.x, desk.z)?.id).toBe("trade");
    expect(nearestTalkDesk(0, 2)).toBeNull();
    expect(buildWorldTalkHref(desk).params.ai).toBe("ai-electrician-001");
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
    expect(director).toContain("REACTIVATE WORLD USER");
    expect(director).toContain("DISCONTINUE WORLD USER");
    expect(await tryApplyWorldDirectorCommand("SET WORLD PACK PRICE civic-dawn 2.49")).toMatch(/2\.49/);
    expect(liveCosmeticPacks().find((p) => p.id === "civic-dawn")?.priceCents).toBe(249);
    expect(await tryApplyWorldDirectorCommand("PAUSE WORLD PACK night-shift")).toMatch(/night-shift/i);
    expect(liveCosmeticPacks().some((p) => p.id === "night-shift")).toBe(false);
    await expect(tryApplyWorldDirectorCommand("SET WORLD PACK PRICE civic-dawn 5.00")).rejects.toThrow();
  });
});
