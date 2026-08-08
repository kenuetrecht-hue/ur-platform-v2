/** Client-safe live session pricing & capacity (mirrors server/_core/ai-session-programming). */

export const CREATOR_MIN_PRICE_CENTS_PER_MINUTE = 20;
/** @deprecated Use CREATOR_MIN_PRICE_CENTS_PER_MINUTE */
export const MIN_PRICE_CENTS_PER_MINUTE = CREATOR_MIN_PRICE_CENTS_PER_MINUTE;

export const ALLOWED_SESSION_DURATIONS = [15, 30, 45, 60] as const;
export type AllowedSessionDuration = (typeof ALLOWED_SESSION_DURATIONS)[number];

export const MAX_SESSION_ATTENDEES = 10_000;
export const SESSION_CAPACITY_PRESETS = [500, 1_000, 5_000, 10_000] as const;

export {
  STANDARD_MIN_PRICE_CENTS_PER_MINUTE,
  GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
  GROUP_APPOINTMENT_PRICE_CENTS_PER_MINUTE,
  GROUP_APPOINTMENT_MIN_ATTENDEES,
  type LiveClassPricingTier,
} from "./live-class-pricing-policy";

export function durationLabel(minutes: AllowedSessionDuration): string {
  if (minutes === 15) return "15 min";
  if (minutes === 30) return "30 min (½ hr)";
  if (minutes === 45) return "45 min";
  return "60 min (1 hr)";
}

export function computeSessionTicketCents(
  durationMinutes: number,
  priceCentsPerMinute: number,
): number {
  const minutes = ALLOWED_SESSION_DURATIONS.includes(durationMinutes as AllowedSessionDuration)
    ? durationMinutes
    : 60;
  const rate = Math.max(CREATOR_MIN_PRICE_CENTS_PER_MINUTE, Math.round(priceCentsPerMinute));
  return minutes * rate;
}
