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
} from "../server/_core/ai-talk-time-tracker";
import {
  AI_TALK_LOT_EXPIRY_DAYS,
  minutesToMilliseconds,
  packTotalMilliseconds,
} from "../lib/ai-talk-time-policy";

describe("ai-talk-time-tracker", () => {
  beforeEach(() => _clearTalkTimeForTests());

  it("hard-codes $5 pack as 25 minutes in milliseconds", () => {
    expect(packTotalMilliseconds("talk_5")).toBe(25 * 60_000);
    expect(minutesToMilliseconds(25)).toBe(1_500_000);
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
    expect(lot.millisecondsIncluded).toBe(1_500_000);
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
    expect(getTalkMillisecondsRemaining("u1")).toBe(1_500_000 - 3250);
    expect(getSpeechUsageLog("u1")).toHaveLength(1);
  });

  it("converts audio seconds to billing ms", () => {
    expect(secondsToBillingMs(3.25)).toBe(3250);
    expect(secondsToBillingMs(0)).toBe(1);
  });

  it("expires unused balance after 30 days", () => {
    createTalkTimeLot({ userId: "u1", packId: "talk_5", priceCents: 500 });
    expect(getTalkMillisecondsRemaining("u1")).toBe(1_500_000);
    _expireTalkLotsForTests("u1");
    expect(getTalkMillisecondsRemaining("u1")).toBe(0);
  });

  it("stacks separate lots from repeat purchases", () => {
    createTalkTimeLot({ userId: "u1", packId: "talk_1", priceCents: 100 });
    createTalkTimeLot({ userId: "u1", packId: "talk_1", priceCents: 100 });
    expect(getTalkTimeStatus("u1").lots).toHaveLength(2);
    expect(getTalkMillisecondsRemaining("u1")).toBe(minutesToMilliseconds(10));
  });
});
