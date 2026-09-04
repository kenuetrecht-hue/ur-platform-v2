import { describe, it, expect, beforeEach } from "vitest";
import {
  UR_THANKS_STAMP_PACKS,
  UR_THANKS_STAMPS_PER_DOLLAR,
  UR_THANKS_STAMPS_PURPOSE,
  UR_THANKS_STAMPS_STEWARD_NOTES,
  getMonthlyThanksSeal,
  getWeeklyThanksSet,
  thanksStampCountForPack,
  listThanksStampPacksForPlatform,
} from "../lib/ur-thanks-stamps";
import { containsForbiddenUrWorldClaim } from "../lib/ur-world-disclosures";
import { buildPlatformOpsSystemPrompt } from "../server/_core/platform-ops-ai";
import {
  _resetThanksStampsForTests,
  getThanksStampWall,
  getThanksStampsWallet,
  giftThanksStampToUserIdForTests,
  placeThanksStamp,
  purchaseThanksStampPack,
} from "../server/_core/ur-thanks-stamps-service";

describe("UR Thanks stamps", () => {
  beforeEach(() => _resetThanksStampsForTests());

  it("sells four stamps per dollar, with a $5 in-app pack for Apple and Google", () => {
    expect(UR_THANKS_STAMPS_PER_DOLLAR).toBe(4);
    const five = UR_THANKS_STAMP_PACKS.find((p) => p.id === "thanks_5");
    expect(five?.priceCents).toBe(500);
    expect(thanksStampCountForPack(five!)).toBe(20);
    expect(thanksStampCountForPack(UR_THANKS_STAMP_PACKS.find((p) => p.id === "thanks_1")!)).toBe(4);
    expect(thanksStampCountForPack(UR_THANKS_STAMP_PACKS.find((p) => p.id === "thanks_2")!)).toBe(8);
    expect(thanksStampCountForPack(UR_THANKS_STAMP_PACKS.find((p) => p.id === "thanks_20")!)).toBe(81);
    expect(thanksStampCountForPack(UR_THANKS_STAMP_PACKS.find((p) => p.id === "thanks_25")!)).toBe(101);
    expect(listThanksStampPacksForPlatform("native").every((p) => p.priceCents === 500)).toBe(true);
    expect(listThanksStampPacksForPlatform("web").every((p) => p.priceCents !== 500)).toBe(true);
  });

  it("rotates a known weekly quartet and a monthly seal", () => {
    const a = getWeeklyThanksSet(new Date(Date.UTC(2026, 0, 5)));
    const b = getWeeklyThanksSet(new Date(Date.UTC(2026, 0, 12)));
    expect(a.stamps).toHaveLength(4);
    expect(a.id).not.toBe(b.id);
    expect(getMonthlyThanksSeal(new Date(Date.UTC(2026, 8, 1))).name).toContain("seal");
  });

  it("does not pitch stamps as a charity gift", () => {
    expect(containsForbiddenUrWorldClaim(UR_THANKS_STAMPS_PURPOSE)).toBe(false);
    expect(UR_THANKS_STAMPS_PURPOSE.toLowerCase()).toContain("not a charity donation");
    expect(UR_THANKS_STAMPS_PURPOSE.toLowerCase()).toContain("not tips");
    expect(UR_THANKS_STAMPS_STEWARD_NOTES.toLowerCase()).toContain("do not call them tips");
  });

  it("teaches the Business Steward the stamp rules", () => {
    const prompt = buildPlatformOpsSystemPrompt("platform-business-steward-ai");
    expect(prompt).toContain("4 stamps per $1");
    expect(prompt).toContain("$5 · 20 stamps");
    expect(prompt).toContain("Do not run a loot box");
    expect(prompt).toContain("The creator receives **100% of the listed tip**");
  });

  it("credits twenty unused stamps for the $5 in-app pack", () => {
    const result = purchaseThanksStampPack({
      userId: "app-user",
      userEmail: "app@test.com",
      packId: "thanks_5",
    });
    expect(result.added).toBe(20);
    expect(getThanksStampsWallet("app-user").count).toBe(20);
  });

  it("credits four unused stamps for a dollar pack", () => {
    const result = purchaseThanksStampPack({
      userId: "u1",
      userEmail: "u1@test.com",
      packId: "thanks_1",
    });
    expect(result.added).toBe(4);
    expect(getThanksStampsWallet("u1").count).toBe(4);
  });

  it("adds the month seal on $20 and $25 packs", () => {
    const twenty = purchaseThanksStampPack({
      userId: "u2",
      userEmail: "u2@test.com",
      packId: "thanks_20",
    });
    expect(twenty.added).toBe(81);
    const bag = getThanksStampsWallet("u2").items;
    expect(bag.some((row) => row.setName === "Month seal")).toBe(true);
  });

  it("lets you gift unused once, then only place", () => {
    purchaseThanksStampPack({ userId: "from", userEmail: "from@test.com", packId: "thanks_1" });
    const stamp = getThanksStampsWallet("from").items[0]!;
    giftThanksStampToUserIdForTests({
      fromUserId: "from",
      instanceId: stamp.instanceId,
      toUserId: "to",
    });
    expect(getThanksStampsWallet("from").count).toBe(3);
    const gifted = getThanksStampsWallet("to").items[0]!;
    expect(gifted.giftable).toBe(false);
    expect(() =>
      giftThanksStampToUserIdForTests({
        fromUserId: "to",
        instanceId: gifted.instanceId,
        toUserId: "other",
      }),
    ).toThrow();
    placeThanksStamp({
      userId: "to",
      displayName: "Pat Friend",
      instanceId: gifted.instanceId,
      targetType: "ai",
      targetId: "contentmate",
    });
    expect(getThanksStampsWallet("to").count).toBe(0);
    expect(getThanksStampWall("ai", "contentmate").posts).toHaveLength(1);
    expect(getThanksStampWall("ai", "contentmate").posts[0]!.fromName).toBe("Pat");
  });

  it("cannot re-gift after placing on an AI page", () => {
    purchaseThanksStampPack({ userId: "fan", userEmail: "fan@test.com", packId: "thanks_1" });
    const stamp = getThanksStampsWallet("fan").items[0]!;
    placeThanksStamp({
      userId: "fan",
      displayName: "Sam Fan",
      instanceId: stamp.instanceId,
      targetType: "ai",
      targetId: "linguamate",
      note: "helped me learn",
    });
    expect(() =>
      giftThanksStampToUserIdForTests({
        fromUserId: "fan",
        instanceId: stamp.instanceId,
        toUserId: "other",
      }),
    ).toThrow();
    expect(getThanksStampWall("ai", "linguamate").posts[0]!.note).toBe("helped me learn");
  });

  it("does not pay a creator when a stamp lands on their wall", () => {
    purchaseThanksStampPack({ userId: "fan", userEmail: "fan@test.com", packId: "thanks_1" });
    const stamp = getThanksStampsWallet("fan").items[0]!;
    placeThanksStamp({
      userId: "fan",
      displayName: "Sam",
      instanceId: stamp.instanceId,
      targetType: "member",
      targetId: "creator-99",
    });
    expect(getThanksStampWall("member", "creator-99").purpose.toLowerCase()).toContain(
      "do not get a payout",
    );
  });
});
