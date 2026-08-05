import { describe, it, expect } from "vitest";
import { getOrCreateUserLink, resolvePublicLink, buildCustomUrl } from "../server/_core/user-link-service";
import {
  recordTransaction,
  listAllTransactions,
  getTransactionStats,
} from "../server/_core/transaction-ledger-service";
import {
  enrollAffiliate,
  enrollContentCreator,
  recordCreatorTransaction,
} from "../server/_core/partner-program-service";

describe("User custom links", () => {
  it("assigns a unique custom URL per person", () => {
    const a = getOrCreateUserLink({
      userId: "u1",
      userEmail: "a@test.com",
      displayName: "Alice",
    });
    const b = getOrCreateUserLink({
      userId: "u2",
      userEmail: "b@test.com",
      displayName: "Bob",
    });
    expect(a.slug).not.toBe(b.slug);
    expect(a.customUrl).toBe(buildCustomUrl(a.slug));
    const resolved = resolvePublicLink(a.slug);
    expect(resolved?.userId).toBe("u1");
  });
});

describe("Transaction ledger", () => {
  it("records every transaction with attribution", () => {
    recordTransaction({
      type: "live_class_ticket",
      amountCents: 1200,
      description: "Test ticket",
      payerUserId: "buyer-1",
      payeeUserId: "creator-1",
      attributionSlug: "aff-slug",
      sessionId: "sess-1",
    });
    const all = listAllTransactions();
    expect(all.length).toBeGreaterThan(0);
    expect(all[0]?.attributionSlug).toBe("aff-slug");
    const stats = getTransactionStats("buyer-1");
    expect(stats.asPayer).toBe(1);
  });

  it("logs creator sales and affiliate bonus on 5th tx", () => {
    const aff = enrollAffiliate({
      userId: "aff-t",
      userEmail: "aff@test.com",
      displayName: "Pat",
    });
    enrollContentCreator({
      userId: "cr-t",
      userEmail: "cr@test.com",
      displayName: "Creator",
      referralCode: aff.customSlug,
    });
    for (let i = 0; i < 5; i++) {
      recordCreatorTransaction({
        creatorUserId: "cr-t",
        amountCents: 500,
        payerUserId: `buyer-${i}`,
        sessionId: `s-${i}`,
        attributionSlug: aff.customSlug,
      });
    }
    const affTxs = listAllTransactions({ userId: "aff-t" });
    expect(affTxs.some((t) => t.type === "affiliate_bonus")).toBe(true);
    expect(listAllTransactions().length).toBeGreaterThanOrEqual(6);
  });
});
