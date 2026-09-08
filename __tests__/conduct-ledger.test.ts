import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("../server/_core/google-ai", () => ({
  isGoogleCloudAiConfigured: () => false,
  generateGoogleChatReply: vi.fn(async () => ({
    reply: "English copy for owner review.",
    model: "test",
  })),
}));
import {
  COMMUNITY_PURPOSE_POLICY,
  COMMUNICATIONS_AUDIT_POLICY,
  CONDUCT_CHECKBOX_LABEL,
  CONDUCT_RULES_VERSION,
  HARASSMENT_ENFORCEMENT_POLICY,
  LAW_ENFORCEMENT_COOPERATION_POLICY,
  PLATFORM_TERMS_SECTIONS,
  PURCHASE_NO_REFUND_CHECKBOX_LABEL,
  TERMS_CHANGE_POLICY,
  TERMS_SIGNUP_ACKNOWLEDGMENT,
} from "../lib/platform-terms-of-use";
import { PLATFORM_DISCLOSURE_BOTTOM } from "../lib/platform-disclosure-copy";
import {
  _resetConductLedgerForTests,
  assertAndRecordNoRefundAck,
  assertConductAccepted,
  getConductStatus,
  hasAcceptedCurrentConduct,
  listCommunicationsForOwner,
  listPurchaseAcksForOwner,
  recordCommunicationForOwner,
  recordConductAcceptance,
} from "../server/_core/conduct-ledger-service";

describe("platform conduct rules", () => {
  it("requires a signed checkbox covering fun, hate, no refunds, logging, and authorities", () => {
    expect(COMMUNITY_PURPOSE_POLICY.toLowerCase()).toContain("have fun");
    expect(COMMUNITY_PURPOSE_POLICY.toLowerCase()).toContain("learn");
    expect(HARASSMENT_ENFORCEMENT_POLICY.toLowerCase()).toContain("hate");
    expect(HARASSMENT_ENFORCEMENT_POLICY.toLowerCase()).toContain("forfeit");
    expect(HARASSMENT_ENFORCEMENT_POLICY.toLowerCase()).toContain("authorities");
    expect(COMMUNICATIONS_AUDIT_POLICY.toLowerCase()).toContain("timestamp");
    expect(COMMUNICATIONS_AUDIT_POLICY.toLowerCase()).toContain("english");
    expect(LAW_ENFORCEMENT_COOPERATION_POLICY.toLowerCase()).toContain("law enforcement");
    expect(TERMS_CHANGE_POLICY.toLowerCase()).toContain("change at any time");
    expect(CONDUCT_CHECKBOX_LABEL.toLowerCase()).toContain("check this box");
    expect(PURCHASE_NO_REFUND_CHECKBOX_LABEL.toLowerCase()).toContain("no refund");
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("hate");
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "community-conduct")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "communications-audit")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "law-enforcement")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "changes")).toBe(true);
  });

  it("keeps the always-on footer covering logging, no refunds, and authorities", () => {
    expect(PLATFORM_DISCLOSURE_BOTTOM.toLowerCase()).toContain("timestamped");
    expect(PLATFORM_DISCLOSURE_BOTTOM.toLowerCase()).toContain("english");
    expect(PLATFORM_DISCLOSURE_BOTTOM.toLowerCase()).toContain("no refunds");
    expect(PLATFORM_DISCLOSURE_BOTTOM.toLowerCase()).toContain("authorities");
    expect(PLATFORM_DISCLOSURE_BOTTOM).toMatch(/AI, not humans/i);
  });
});

describe("conduct ledger", () => {
  beforeEach(() => _resetConductLedgerForTests());

  it("blocks unsigned members and records a timestamped signature", () => {
    expect(hasAcceptedCurrentConduct("member-1")).toBe(false);
    expect(() => assertConductAccepted({ userId: "member-1" })).toThrow(TRPCError);
    assertConductAccepted({ userId: "member-1", isPlatformOwner: true });
    const signed = recordConductAcceptance({ userId: "member-1", userEmail: "a@example.com" });
    expect(signed.version).toBe(CONDUCT_RULES_VERSION);
    expect(signed.acceptedAt).toMatch(/T/);
    expect(getConductStatus("member-1").accepted).toBe(true);
    expect(() => assertConductAccepted({ userId: "member-1" })).not.toThrow();
  });

  it("timestamps a no-refund purchase check", () => {
    const ack = assertAndRecordNoRefundAck({
      userId: "member-1",
      sku: "apparel.civic-dawn",
      amountCents: 199,
      acceptedNoRefund: true,
    });
    expect(ack.acceptedAt).toMatch(/T/);
    expect(listPurchaseAcksForOwner()[0]?.sku).toBe("apparel.civic-dawn");
  });

  it("stores the Talk Time rules they checked so a later dispute has a record", () => {
    const ack = assertAndRecordNoRefundAck({
      userId: "member-1",
      sku: "talk.talk_5",
      amountCents: 500,
      acceptedNoRefund: true,
      agreementVersion: "talk-rules-v1-2026-09-07",
      agreementText: "I pay $5.00 for 20 minutes. I must use them within 30 days or I lose what is left. No refunds.",
    });
    expect(ack.agreementVersion).toBe("talk-rules-v1-2026-09-07");
    expect(ack.agreementText).toContain("20 minutes");
    expect(ack.agreementText).toContain("30 days");
    expect(listPurchaseAcksForOwner()[0]?.agreementVersion).toBe("talk-rules-v1-2026-09-07");
  });

  it("saves a copied, timestamped English communication for owner review", async () => {
    const row = await recordCommunicationForOwner({
      channel: "direct_message",
      userId: "member-1",
      original: "Hello friend, let's learn a trade.",
    });
    expect(row.createdAt).toMatch(/T/);
    expect(row.english.toLowerCase()).toContain("hello");
    expect(row.original).toContain("Hello");
    expect(row.originalLanguage).toBe("English");
    expect(listCommunicationsForOwner()[0]?.id).toBe(row.id);
  });

  it("stores the original foreign language next to an English copy", async () => {
    const original = "Hola amigo, vamos a aprender un oficio. ¿Cómo estás?";
    const row = await recordCommunicationForOwner({
      channel: "direct_message",
      userId: "member-es",
      original,
    });
    expect(row.original).toBe(original);
    expect(row.originalLanguage).toBe("Spanish");
    expect(row.english).toBeTruthy();
    expect(row.english).not.toBe(original);
    expect(row.translated).toBe(true);
    expect(listCommunicationsForOwner()[0]?.original).toBe(original);
    expect(listCommunicationsForOwner()[0]?.english).toBe(row.english);
  });
});
