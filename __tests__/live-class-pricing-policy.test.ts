import { describe, it, expect } from "vitest";
import {
  resolveLiveClassPricing,
  computeTierTicketCents,
  GROUP_APPOINTMENT_MIN_ATTENDEES,
  GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
  STANDARD_MIN_PRICE_CENTS_PER_MINUTE,
} from "../lib/live-class-pricing-policy";

describe("live-class-pricing-policy", () => {
  it("resolves standard tier at $0.20/min", () => {
    const p = resolveLiveClassPricing({ minAttendeesToStart: 5, priceCentsPerMinute: 20 });
    expect(p.pricingTier).toBe("standard");
    expect(p.priceCentsPerMinute).toBe(STANDARD_MIN_PRICE_CENTS_PER_MINUTE);
    expect(p.refundsOnUnderfill).toBe(false);
    expect(computeTierTicketCents(60, p)).toBe(1200);
  });

  it("resolves group appointment at $0.01/min floor with 25 minimum", () => {
    const p = resolveLiveClassPricing({ pricingTier: "group_appointment", minAttendeesToStart: 25 });
    expect(p.pricingTier).toBe("group_appointment");
    expect(p.priceCentsPerMinute).toBe(GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE);
    expect(p.minAttendeesToStart).toBe(GROUP_APPOINTMENT_MIN_ATTENDEES);
    expect(p.refundsOnUnderfill).toBe(true);
    expect(p.ticketOnlyMinimum).toBe(true);
    expect(computeTierTicketCents(60, p)).toBe(60);
  });

  it("allows higher rates on group appointments (e.g. $0.02 or $0.20/min)", () => {
    const twoCent = resolveLiveClassPricing({
      pricingTier: "group_appointment",
      minAttendeesToStart: 25,
      priceCentsPerMinute: 2,
    });
    expect(twoCent.priceCentsPerMinute).toBe(2);
    expect(computeTierTicketCents(60, twoCent)).toBe(120);

    const twentyCent = resolveLiveClassPricing({
      pricingTier: "group_appointment",
      minAttendeesToStart: 30,
      priceCentsPerMinute: 20,
    });
    expect(twentyCent.priceCentsPerMinute).toBe(20);
    expect(twentyCent.minAttendeesToStart).toBe(30);
    expect(computeTierTicketCents(60, twentyCent)).toBe(1200);
  });

  it("rejects penny pricing below 25 attendees", () => {
    expect(() =>
      resolveLiveClassPricing({ priceCentsPerMinute: 1, minAttendeesToStart: 10 }),
    ).toThrow(/25/);
  });

  it("rejects sub-twenty-cent pricing on standard tier", () => {
    expect(() =>
      resolveLiveClassPricing({ priceCentsPerMinute: 1, minAttendeesToStart: 5 }),
    ).toThrow(/\$0.20\/min/);
  });
});
