/**
 * Hard-coded UR metering policy — millisecond voice, message-on-success text,
 * automatic pause on disconnect, exact resume with no lost balance.
 */

/** One minute in milliseconds — never use floating minutes for billing. */
export const MS_PER_BILLING_MINUTE = 60_000;

/** Client must heartbeat this often while voice/video is playing and online. */
export const METER_HEARTBEAT_INTERVAL_MS = 5_000;

/** No heartbeat within this window → server auto-pauses billing (disconnect). */
export const METER_DISCONNECT_PAUSE_THRESHOLD_MS = 12_000;

/** Max age of a paused session before auto-finalize (deduct connected time only). */
export const METER_PAUSED_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const AI_METERING_POLICY_HEADLINE = "Disconnect-safe metering";

export const AI_VOICE_METERING_DISCLOSURE =
  "AI speech is billed only while you are connected and audio is playing — tracked to the millisecond. " +
  "If your internet drops, billing stops immediately. When you reconnect, playback and your remaining balance " +
  "resume exactly where they left off. You are never charged for offline time.";

export const AI_TEXT_METERING_DISCLOSURE =
  "Text messages are counted only after a successful round-trip with the server. " +
  "If your connection fails mid-send, the message is not billed and your allowance is unchanged.";

export const AI_METERING_RESUME_DISCLOSURE =
  "Example: if talk time stops at 4:30.320 remaining, you return to 4:30.320 when back online — " +
  "no minutes lost during the outage.";

export const AI_METERING_PAYBACK_PROTECTION =
  "UR only deducts talk time for confirmed connected playback and text for delivered replies. " +
  "Disconnects, timeouts, and failed requests do not consume your purchase.";

export function formatMeterMs(ms: number): string {
  if (ms <= 0) return "0:00.000";
  const minutes = Math.floor(ms / MS_PER_BILLING_MINUTE);
  const seconds = Math.floor((ms % MS_PER_BILLING_MINUTE) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function clampBillableMs(params: {
  connectedMs: number;
  maxSessionMs: number;
  balanceMs: number;
}): number {
  return Math.max(0, Math.min(params.connectedMs, params.maxSessionMs, params.balanceMs));
}
