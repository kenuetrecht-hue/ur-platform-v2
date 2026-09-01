/** Pay-per-view replay of an ended live class — people who missed it can buy the recording. */

export const CLASS_REPLAY_MIN_PRICE_CENTS = 99;
export const CLASS_REPLAY_MAX_PRICE_CENTS = 50_000;
export const CLASS_REPLAY_CREATOR_SHARE = 0.85;

export function clampClassReplayPriceCents(priceCents: number): number {
  const rounded = Math.round(priceCents);
  if (rounded <= 0) return 0;
  return Math.min(CLASS_REPLAY_MAX_PRICE_CENTS, Math.max(CLASS_REPLAY_MIN_PRICE_CENTS, rounded));
}

export function defaultClassReplayPriceCents(liveTicketCents: number): number {
  return clampClassReplayPriceCents(Math.max(CLASS_REPLAY_MIN_PRICE_CENTS, Math.round(liveTicketCents * 0.5)));
}

export function isSafeReplayVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const CLASS_REPLAY_PURCHASE_RULES = [
  "This is a pay-per-view recording of a class that already happened. It is not a live seat.",
  "People who bought a live ticket for this class can watch the replay at no extra charge.",
  "Creators keep 85% of replay sales; UR Platform LLC keeps 15%.",
  "Production card charges stay off until real Stripe checkout is turned on. Development uses a simulated purchase.",
  "Recordings use Mux as the primary video engine. Paid replays play through a short-lived signed Mux link.",
] as const;
