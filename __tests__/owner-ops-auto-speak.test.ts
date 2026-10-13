import { describe, expect, it, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  OWNER_CHAT_UNLIMITED_MONTHLY_CENTS,
  ownerChatIsUnlimited,
  sumMonthPlatformRevenueCents,
} from "../lib/owner-ops-auto-speak";
import {
  _forceOwnerChatRevenueForTests,
  _resetOwnerChatAllowanceForTests,
  assertOwnerChatAllowed,
  getOwnerOpsAutoSpeakStatus,
  recordOwnerChat,
} from "../server/_core/owner-ops-auto-speak-service";

describe("owner chat allowance", () => {
  const now = new Date("2026-09-15T16:00:00.000Z");

  afterEach(() => {
    _resetOwnerChatAllowanceForTests();
  });

  it("counts platform revenue for the current month and ignores payouts", () => {
    const rows = [
      { type: "live_class_ticket", status: "completed", amountCents: 400_000, createdAt: "2026-09-02T15:00:00.000Z" },
      { type: "other", status: "completed", amountCents: 100_000, createdAt: "2026-09-10T15:00:00.000Z" },
      { type: "creator_payout", status: "completed", amountCents: 900_000, createdAt: "2026-09-11T15:00:00.000Z" },
      { type: "other", status: "completed", amountCents: 50_000, createdAt: "2026-08-11T15:00:00.000Z" },
      { type: "tip", status: "refunded", amountCents: 80_000, createdAt: "2026-09-12T15:00:00.000Z" },
    ];
    expect(sumMonthPlatformRevenueCents(rows, now)).toBe(500_000);
    expect(OWNER_CHAT_UNLIMITED_MONTHLY_CENTS).toBe(500_000);
    expect(ownerChatIsUnlimited(499_999)).toBe(false);
    expect(ownerChatIsUnlimited(500_000)).toBe(true);
  });

  it("lets the owner keep talking with no daily stop", () => {
    _forceOwnerChatRevenueForTests(0);
    expect(getOwnerOpsAutoSpeakStatus(now).autoSpeak).toBe(true);
    expect(getOwnerOpsAutoSpeakStatus(now).unlimited).toBe(true);
    expect(getOwnerOpsAutoSpeakStatus(now).dailyCap).toBeNull();

    for (let i = 0; i < 25; i++) {
      assertOwnerChatAllowed(now);
      recordOwnerChat(now);
    }
    expect(() => assertOwnerChatAllowed(now)).not.toThrow();
  });

  it("opens each administration AI in its own chat room and speaks the reply", () => {
    const chat = readFileSync("app/owner-ai/[creatorId]/chat.tsx", "utf8");
    const hub = readFileSync("components/platform-ops-console.tsx", "utf8");
    const handler = readFileSync("server/_core/ai-chat-handler.ts", "utf8");
    const ui = readFileSync("components/creator-ai-interface.tsx", "utf8");
    const frame = readFileSync("components/platform-disclosure-frame.tsx", "utf8");
    const publicChat = readFileSync("app/ai/[creatorId]/chat.tsx", "utf8");
    expect(hub).toContain("owner-ops-open-chat");
    expect(chat).toContain("speakReplies");
    expect(chat).not.toContain("autoSpeak === true");
    expect(chat).not.toContain("You are talking to an AI");
    expect(chat).not.toContain("buildAiChatDisclosure");
    expect(ui).toContain("ownerOpsChat ? null");
    expect(ui).toContain("isOwnerOpsAiId(creatorId)");
    expect(ui).toContain("useLayoutEffect");
    expect(ui).toContain("ur-chat-composer-owner");
    expect(ui).toContain("frameHeight={ownerOpsChat ? 240 : undefined}");
    expect(frame).toContain('segments[0] === "owner-ai"');
    expect(publicChat).toContain("You are talking to an AI");
    expect(publicChat).toContain("buildAiChatDisclosure");
    expect(chat).toContain("onBack");
    expect(chat).toContain('toolRail="left"');
    expect(handler).toContain("assertOwnerChatAllowed");
    expect(handler).toContain("recordOwnerChat");
  });
});
