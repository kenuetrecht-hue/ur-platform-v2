/** A phone or laptop video posts whole up to this size. */
export const FEED_VIDEO_MAX_BYTES = 250 * 1024 * 1024;

const FLOOR_BPS = 350_000;
const CEILING_BPS = 2_500_000;

/** Bits per second that keeps the clip under the upload cap. */
export function feedVideoBitrate(durationSeconds: number, maxBytes = FEED_VIDEO_MAX_BYTES): number {
  const seconds = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1;
  const budget = Math.floor((maxBytes * 0.8 * 8) / seconds);
  return Math.min(CEILING_BPS, Math.max(FLOOR_BPS, budget));
}

/**
 * Seconds to keep. A normal clip stays whole.
 * Only a very long clip is shortened, and the start is what posts.
 */
export function feedVideoKeepSeconds(durationSeconds: number, maxBytes = FEED_VIDEO_MAX_BYTES): number {
  const seconds = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  const maxSeconds = Math.floor((maxBytes * 0.8 * 8) / FLOOR_BPS);
  if (seconds <= maxSeconds) return seconds;
  return maxSeconds;
}

export function feedVideoFits(size: number, maxBytes = FEED_VIDEO_MAX_BYTES): boolean {
  return size <= maxBytes;
}
