import { describe, it, expect, beforeEach } from "vitest";
import {
  createTalkTimeLot,
  consumeTalkTimeMs,
  getTalkMillisecondsRemaining,
  getTalkTimeStatus,
  getSpeechUsageLog,
  _clearTalkTimeForTests,
  _expireTalkLotsForTests,
  secondsToBillingMs,
  assertTalkTimeAvailable,
  assertTalkPurchaseFitsStockpileCap,
} from "../server/_core/ai-talk-time-tracker";
import {
  AI_TALK_LOT_EXPIRY_DAYS,
  AI_TALK_BULK_EXPIRY_DAYS,
  AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
  AI_TALK_LOW_BALANCE_MS,
  AI_TALK_MAX_UNUSED_MINUTES,
  buildTalkLotTrackerView,
  daysUntilTalkExpiry,
  formatTalkLotLoseBy,
  getTalkLowBalanceNotice,
  isTalkTimeLowBalance,
  minutesToMilliseconds,
  packTotalMilliseconds,
} from "../lib/ai-talk-time-policy";

describe("ai-talk-time-tracker", () => {
  beforeEach(() => _clearTalkTimeForTests());

  it("hard-codes $5 pack as 20 minutes in milliseconds", () => {
    expect(packTotalMilliseconds("talk_5")).toBe(20 * 60_000);
    expect(minutesToMilliseconds(20)).toBe(1_200_000);
  });

  it("creates lots that expire in 30 days", () => {
    const purchasedAt = Date.parse("2026-01-01T12:00:00.000Z");
    const lot = createTalkTimeLot({
      userId: "u1",
      packId: "talk_5",
      priceCents: 500,
      purchasedAtMs: purchasedAt,
    });
    const expiresMs = Date.parse(lot.expiresAt);
    expect(expiresMs - purchasedAt).toBe(AI_TALK_LOT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    expect(lot.millisecondsIncluded).toBe(1_200_000);
  });

  it("gives $120 and $200 packs 90 days to use", () => {
    const purchasedAt = Date.parse("2026-01-01T12:00:00.000Z");
    const lot200 = createTalkTimeLot({
      userId: "bulk-90",
      packId: "talk_200",
      priceCents: 20_000,
      purchasedAtMs: purchasedAt,
    });
    const lot120 = createTalkTimeLot({
      userId: "bulk-90b",
      packId: "talk_120",
      priceCents: 12_000,
      purchasedAtMs: purchasedAt,
    });
    expect(Date.parse(lot200.expiresAt) - purchasedAt).toBe(AI_TALK_BULK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    expect(Date.parse(lot120.expiresAt) - purchasedAt).toBe(AI_TALK_BULK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  });

  it("blocks stockpiling past 1,000 unused minutes", () => {
    createTalkTimeLot({ userId: "cap-user", packId: "talk_200", priceCents: 20_000 });
    expect(() => assertTalkPurchaseFitsStockpileCap("cap-user", 5)).toThrow(/1,000 unused minutes/);
    expect(() => assertTalkPurchaseFitsStockpileCap("empty-user", AI_TALK_MAX_UNUSED_MINUTES)).not.toThrow();
  });

  it("deducts speech to the millisecond", () => {
    createTalkTimeLot({ userId: "u1", packId: "talk_5", priceCents: 500 });
    const usage = consumeTalkTimeMs({
      userId: "u1",
      creatorId: "ai-marina-mechanic-001",
      durationMs: 3250,
      source: "voice_synthesis",
    });
    expect(usage.durationMs).toBe(3250);
    expect(getTalkMillisecondsRemaining("u1")).toBe(1_200_000 - 3250);
    expect(getSpeechUsageLog("u1")).toHaveLength(1);
  });

  it("converts audio seconds to billing ms", () => {
    expect(secondsToBillingMs(3.25)).toBe(3250);
    expect(secondsToBillingMs(0)).toBe(1);
  });

  it("expires unused balance after 30 days", () => {
    createTalkTimeLot({ userId: "u1", packId: "talk_5", priceCents: 500 });
    expect(getTalkMillisecondsRemaining("u1")).toBe(1_200_000);
    _expireTalkLotsForTests("u1");
    expect(getTalkMillisecondsRemaining("u1")).toBe(0);
  });

  it("stacks separate lots from repeat purchases", () => {
    createTalkTimeLot({ userId: "u1", packId: "talk_1", priceCents: 100 });
    createTalkTimeLot({ userId: "u1", packId: "talk_1", priceCents: 100 });
    expect(getTalkTimeStatus("u1").lots).toHaveLength(2);
    expect(getTalkMillisecondsRemaining("u1")).toBe(minutesToMilliseconds(10));
  });

  it("tracks remaining time and lose-by date on each purchase lot", () => {
    const purchasedAt = Date.parse("2026-08-21T18:00:00.000Z");
    const lot = createTalkTimeLot({
      userId: "tracker-user",
      packId: "talk_200",
      priceCents: 20_000,
      purchasedAtMs: purchasedAt,
    });
    const status = getTalkTimeStatus("tracker-user");
    expect(status.lots).toHaveLength(1);
    expect(status.lots[0]?.tracker.remainingDisplay).toBe("1000:00");
    expect(status.lots[0]?.tracker.expiresAt).toBe(lot.expiresAt);
    expect(status.lots[0]?.tracker.daysUntilExpiry).toBeGreaterThan(0);
    expect(status.lots[0]?.tracker.loseByLabel.toLowerCase()).toContain("use by");
    expect(status.lots[0]?.tracker.loseByLabel.toLowerCase()).toContain("lose unused time");
  });
});

describe("talk time expiry tracker copy", () => {
  it("states unused time is lost after 30 or 90 days and cannot be stockpiled", () => {
    expect(AI_TALK_EXPIRY_PURCHASE_DISCLOSURE.toLowerCase()).toContain("30 days");
    expect(AI_TALK_EXPIRY_PURCHASE_DISCLOSURE.toLowerCase()).toContain("90 days");
    expect(AI_TALK_EXPIRY_PURCHASE_DISCLOSURE.toLowerCase()).toContain("lose what isn't used");
    expect(AI_TALK_EXPIRY_PURCHASE_DISCLOSURE.toLowerCase()).toContain("1,000 unused minutes");
  });

  it("counts days until a lot is lost", () => {
    const now = Date.parse("2026-08-21T12:00:00.000Z");
    const expires = new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntilTalkExpiry(expires, now)).toBe(10);
    expect(formatTalkLotLoseBy(expires, now).toLowerCase()).toContain("10 days left");
    expect(formatTalkLotLoseBy(expires, now).toLowerCase()).toContain("lose unused time");
  });

  it("warns at five minutes so the user can re-up", () => {
    expect(isTalkTimeLowBalance(AI_TALK_LOW_BALANCE_MS)).toBe(true);
    expect(isTalkTimeLowBalance(AI_TALK_LOW_BALANCE_MS + 1)).toBe(false);
    expect(isTalkTimeLowBalance(1)).toBe(true);
    expect(isTalkTimeLowBalance(0)).toBe(false);
    const notice = getTalkLowBalanceNotice(4 * 60_000);
    expect(notice).toContain("last 4:00");
    expect(notice?.toLowerCase()).toContain("re-up");
    expect(getTalkLowBalanceNotice(6 * 60_000)).toBeNull();
  });

  it("builds a per-purchase tracker row", () => {
    const expiresAt = new Date("2026-09-20T16:00:00.000Z").toISOString();
    const view = buildTalkLotTrackerView({
      id: "lot-1",
      packId: "talk_5",
      expiresAt,
      millisecondsRemaining: 90_000,
    }, Date.parse("2026-08-21T16:00:00.000Z"));
    expect(view.packLabel).toBe("$5 Talk");
    expect(view.remainingDisplay).toBe("1:30");
    expect(view.daysUntilExpiry).toBe(30);
    expect(view.loseByLabel).toContain("Use by");
  });

  it("does not bill the platform owner for talk packs", () => {
    expect(() => assertTalkTimeAvailable("owner", 1, true)).not.toThrow();
    const usage = consumeTalkTimeMs({
      userId: "owner",
      creatorId: "linguamate",
      durationMs: 8000,
      source: "voice_synthesis",
      isPlatformOwner: true,
    });
    expect(usage.lotId).toBe("owner-complimentary");
    expect(usage.durationMs).toBe(8000);
    expect(getTalkMillisecondsRemaining("owner")).toBe(0);
    expect(() => assertTalkTimeAvailable("member", 1, false)).toThrow(/Purchase AI talk time/);
  });
});
