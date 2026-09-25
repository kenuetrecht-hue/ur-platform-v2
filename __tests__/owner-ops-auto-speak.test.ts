import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  OWNER_OPS_AUTO_SPEAK_MONTHLY_CENTS,
  ownerOpsShouldAutoSpeak,
  sumMonthPlatformRevenueCents,
} from "../lib/owner-ops-auto-speak";
import { getOwnerOpsAutoSpeakStatus } from "../server/_core/owner-ops-auto-speak-service";

describe("owner ops auto speak", () => {
  const now = new Date("2026-09-15T16:00:00.000Z");

  it("speaks only after $10,000 of platform revenue in the current month", () => {
    expect(OWNER_OPS_AUTO_SPEAK_MONTHLY_CENTS).toBe(1_000_000);
    const rows = [
      { type: "live_class_ticket", status: "completed", amountCents: 400_000, createdAt: "2026-09-02T15:00:00.000Z" },
      { type: "other", status: "completed", amountCents: 600_000, createdAt: "2026-09-10T15:00:00.000Z" },
      { type: "creator_payout", status: "completed", amountCents: 900_000, createdAt: "2026-09-11T15:00:00.000Z" },
      { type: "other", status: "completed", amountCents: 50_000, createdAt: "2026-08-11T15:00:00.000Z" },
      { type: "tip", status: "refunded", amountCents: 80_000, createdAt: "2026-09-12T15:00:00.000Z" },
    ];
    expect(sumMonthPlatformRevenueCents(rows, now)).toBe(1_000_000);
    expect(ownerOpsShouldAutoSpeak(999_999)).toBe(false);
    expect(ownerOpsShouldAutoSpeak(1_000_000)).toBe(true);
    expect(getOwnerOpsAutoSpeakStatus(now).thresholdCents).toBe(1_000_000);
    expect(getOwnerOpsAutoSpeakStatus(now).autoSpeak).toBe(false);
  });

  it("opens each administration AI in its own chat room and keeps the reply as text", () => {
    const chat = readFileSync("app/owner-ai/[creatorId]/chat.tsx", "utf8");
    const hub = readFileSync("components/platform-ops-console.tsx", "utf8");
    expect(hub).toContain("owner-ops-open-chat");
    expect(chat).toContain("speakReplies={voice.data?.autoSpeak === true}");
    expect(chat).toContain("the same words stay in this chat");
    expect(chat).toContain("You are talking to an AI");
    expect(chat).toContain("onBack");
  });
});