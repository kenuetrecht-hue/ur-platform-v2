import { describe, expect, it } from "vitest";
import {
  countUniquePageVisitors,
  salesDeskAdvice,
  summarizeCreatorSales,
} from "../lib/creator-sales-desk";

describe("creator sales desk", () => {
  it("counts only that creator's completed class, replay, and tip sales", () => {
    const since = Date.parse("2026-09-01T00:00:00.000Z");
    const summary = summarizeCreatorSales(
      [
        { type: "live_class_ticket", status: "completed", amountCents: 1000, createdAt: "2026-09-15T00:00:00.000Z", payeeUserId: "c1" },
        { type: "tip", status: "completed", amountCents: 500, createdAt: "2026-09-16T00:00:00.000Z", payeeUserId: "c1" },
        { type: "tip", status: "refunded", amountCents: 500, createdAt: "2026-09-16T00:00:00.000Z", payeeUserId: "c1" },
        { type: "affiliate_bonus", status: "completed", amountCents: 200, createdAt: "2026-09-16T00:00:00.000Z", payeeUserId: "c1" },
        { type: "tip", status: "completed", amountCents: 900, createdAt: "2026-09-16T00:00:00.000Z", payeeUserId: "other" },
      ],
      "c1",
      since,
    );
    expect(summary.count).toBe(2);
    expect(summary.cents).toBe(1500);
    expect(summary.offers[0]?.label).toBe("Live class");
  });

  it("counts each person once on the creator link", () => {
    const since = Date.parse("2026-09-01T00:00:00.000Z");
    const opens = countUniquePageVisitors(
      [
        { visitorId: "a", kind: "page", path: "/link/ada", createdAt: "2026-09-10T00:00:00.000Z" },
        { visitorId: "a", kind: "page", path: "/link/ada", createdAt: "2026-09-11T00:00:00.000Z" },
        { visitorId: "b", kind: "button", path: "/link/ada", createdAt: "2026-09-11T00:00:00.000Z" },
        { visitorId: "c", kind: "page", path: "/link/other", createdAt: "2026-09-11T00:00:00.000Z" },
      ],
      "/link/ada",
      since,
    );
    expect(opens).toBe(1);
  });

  it("tells a creator to share the link before anything else", () => {
    expect(salesDeskAdvice({ linkOpens: 0, salesCount: 0, topOfferLabel: null, topPostLikes: 0 })).toMatch(/Share your creator link/i);
  });

  it("points a tip-heavy creator toward a class or call", () => {
    expect(salesDeskAdvice({ linkOpens: 4, salesCount: 2, topOfferLabel: "Tip", topPostLikes: 1 })).toMatch(/85%/);
  });
});
