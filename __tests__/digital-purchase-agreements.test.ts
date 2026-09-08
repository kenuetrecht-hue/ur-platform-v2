import { describe, it, expect } from "vitest";
import {
  buildTalkPurchaseAgreement,
  buildTextPassPurchaseAgreement,
  serializePurchaseAgreement,
  TEXT_PASS_RULES_VERSION,
} from "../lib/digital-purchase-agreements";
import { TALK_PURCHASE_RULES_VERSION } from "../lib/ai-talk-time-policy";

describe("digital purchase agreements", () => {
  it("$5 Talk Time states pay, get, 30-day clock, stockpile cap, and no refunds", () => {
    const agreement = buildTalkPurchaseAgreement("talk_5");
    expect(agreement.version).toBe(TALK_PURCHASE_RULES_VERSION);
    expect(agreement.checkboxLabel.toLowerCase()).toContain("this check is saved");
    expect(agreement.checkboxLabel).toContain("$5.00");
    expect(agreement.checkboxLabel).toContain("20 minutes");
    expect(agreement.checkboxLabel).toContain("30 days");
    expect(agreement.checkboxLabel).toContain("1,000 unused minutes");
    expect(agreement.rules.some((r) => r.includes("$5.00"))).toBe(true);
    expect(agreement.rules.some((r) => r.includes("20 minutes"))).toBe(true);
    expect(agreement.rules.some((r) => r.toLowerCase().includes("hear"))).toBe(true);
    expect(agreement.rules.some((r) => r.includes("30 days"))).toBe(true);
    expect(agreement.rules.some((r) => r.toLowerCase().includes("no refund"))).toBe(true);
  });

  it("$1 Talk Time must be used in 30 days", () => {
    const agreement = buildTalkPurchaseAgreement("talk_1");
    expect(agreement.checkboxLabel).toContain("$1.00");
    expect(agreement.checkboxLabel).toContain("5 minutes");
    expect(agreement.checkboxLabel).toContain("30 days");
  });

  it("$120 and $200 Talk Time get 90 days and cannot be stockpiled", () => {
    const a120 = buildTalkPurchaseAgreement("talk_120");
    const a200 = buildTalkPurchaseAgreement("talk_200");
    expect(a120.checkboxLabel).toContain("$120.00");
    expect(a120.checkboxLabel).toContain("500 minutes");
    expect(a120.checkboxLabel).toContain("90 days");
    expect(a200.checkboxLabel).toContain("$200.00");
    expect(a200.checkboxLabel).toContain("1,000 minutes");
    expect(a200.checkboxLabel).toContain("90 days");
    expect(a200.checkboxLabel).toContain("1,000 unused minutes");
  });

  it("text pass states pay, message count, how long it lasts, mic vs Hear, and leftover death", () => {
    const month = buildTextPassPurchaseAgreement("month");
    expect(month.version).toBe(TEXT_PASS_RULES_VERSION);
    expect(month.checkboxLabel).toContain("$24.99");
    expect(month.checkboxLabel.toLowerCase()).toContain("30 days");
    expect(month.checkboxLabel.toLowerCase()).toContain("hear is not included");
    expect(month.checkboxLabel.toLowerCase()).toContain("this check is saved");
    expect(month.rules.some((r) => r.toLowerCase().includes("microphone print"))).toBe(true);
    expect(month.rules.some((r) => r.toLowerCase().includes("leftover messages are gone"))).toBe(true);
    expect(serializePurchaseAgreement(month)).toContain(TEXT_PASS_RULES_VERSION);
  });
});
