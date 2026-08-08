/**
 * Live class pricing tiers:
 * - standard: $0.20/min minimum, flexible minimum headcount
 * - group_appointment: $0.01/min minimum (creators may charge more), 25+ paid tickets, unlimited capacity, auto-refund if underfilled
 */

const MAX_SESSION_ATTENDEES = 10_000;

export const STANDARD_MIN_PRICE_CENTS_PER_MINUTE = 20;
/** Floor for group appointments (25+ paid signups) — not a fixed price. */
export const GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE = 1;
/** @deprecated Use GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE */
export const GROUP_APPOINTMENT_PRICE_CENTS_PER_MINUTE = GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE;
export const GROUP_APPOINTMENT_MIN_ATTENDEES = 25;

export type LiveClassPricingTier = "standard" | "group_appointment";

export type ResolvedLiveClassPricing = {
  pricingTier: LiveClassPricingTier;
  priceCentsPerMinute: number;
  minAttendeesToStart: number;
  maxAttendees: number;
  refundsOnUnderfill: boolean;
  ticketOnlyMinimum: boolean;
  tierLabel: string;
  tierDescription: string;
};

export function isGroupAppointmentTier(tier: LiveClassPricingTier): boolean {
  return tier === "group_appointment";
}

export function clampGroupAppointmentRate(priceCentsPerMinute: number): number {
  return Math.max(GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE, Math.round(priceCentsPerMinute));
}

export function clampStandardRate(priceCentsPerMinute: number): number {
  return Math.max(STANDARD_MIN_PRICE_CENTS_PER_MINUTE, Math.round(priceCentsPerMinute));
}

export function computeTierTicketCents(
  durationMinutes: number,
  pricing: Pick<ResolvedLiveClassPricing, "pricingTier" | "priceCentsPerMinute">,
): number {
  const minutes = durationMinutes;
  const rate =
    pricing.pricingTier === "group_appointment"
      ? clampGroupAppointmentRate(pricing.priceCentsPerMinute)
      : clampStandardRate(pricing.priceCentsPerMinute);
  return minutes * rate;
}

export function resolveLiveClassPricing(params: {
  pricingTier?: LiveClassPricingTier;
  priceCentsPerMinute?: number;
  minAttendeesToStart?: number;
  maxAttendees?: number;
}): ResolvedLiveClassPricing {
  const requestedMin = Math.max(1, Math.round(params.minAttendeesToStart ?? 1));
  const requestedPrice =
    params.priceCentsPerMinute != null ? Math.round(params.priceCentsPerMinute) : undefined;
  const requestedMax =
    params.maxAttendees != null
      ? Math.min(MAX_SESSION_ATTENDEES, Math.max(1, Math.round(params.maxAttendees)))
      : undefined;

  const explicitGroup = params.pricingTier === "group_appointment";
  const highMinimum = requestedMin >= GROUP_APPOINTMENT_MIN_ATTENDEES;
  const belowStandardFloor =
    requestedPrice != null && requestedPrice < STANDARD_MIN_PRICE_CENTS_PER_MINUTE;

  if (explicitGroup || (highMinimum && belowStandardFloor)) {
    if (requestedMin < GROUP_APPOINTMENT_MIN_ATTENDEES) {
      throw new Error(
        `Group appointments require at least ${GROUP_APPOINTMENT_MIN_ATTENDEES} attendees. Use standard pricing ($0.20/min) for smaller groups.`,
      );
    }
    if (requestedPrice != null && requestedPrice < GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE) {
      throw new Error(
        `Group appointments start at $0.01/min. You may charge $0.02/min, $0.20/min, or any higher rate.`,
      );
    }

    const priceCentsPerMinute = clampGroupAppointmentRate(
      requestedPrice ?? GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
    );

    return {
      pricingTier: "group_appointment",
      priceCentsPerMinute,
      minAttendeesToStart: Math.max(GROUP_APPOINTMENT_MIN_ATTENDEES, requestedMin),
      maxAttendees: MAX_SESSION_ATTENDEES,
      refundsOnUnderfill: true,
      ticketOnlyMinimum: true,
      tierLabel: "Group appointment",
      tierDescription: `$${(priceCentsPerMinute / 100).toFixed(2)}/min (min $0.01) · ${GROUP_APPOINTMENT_MIN_ATTENDEES}+ paid signups · unlimited seats · full refund if minimum not met`,
    };
  }

  if (requestedPrice != null && requestedPrice < STANDARD_MIN_PRICE_CENTS_PER_MINUTE) {
    throw new Error(
      `Rates below $0.20/min are only available for group appointments with at least ${GROUP_APPOINTMENT_MIN_ATTENDEES} paid signups. Standard classes start at $0.20/min.`,
    );
  }

  const priceCentsPerMinute = clampStandardRate(
    requestedPrice ?? STANDARD_MIN_PRICE_CENTS_PER_MINUTE,
  );

  const maxAttendees = requestedMax ?? MAX_SESSION_ATTENDEES;
  const minAttendeesToStart = Math.min(maxAttendees, requestedMin);

  return {
    pricingTier: "standard",
    priceCentsPerMinute,
    minAttendeesToStart,
    maxAttendees,
    refundsOnUnderfill: false,
    ticketOnlyMinimum: false,
    tierLabel: "Standard live class",
    tierDescription: `$${(priceCentsPerMinute / 100).toFixed(2)}/min · $0.20/min floor · up to ${maxAttendees.toLocaleString()} seats`,
  };
}
