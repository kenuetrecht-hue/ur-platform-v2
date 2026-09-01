/** Mux is the primary video engine — ingest, adaptive HLS, signed pay-per-view playback. */

export const PRIMARY_VIDEO_ENGINE = "mux" as const;

export const MUX_VIDEO_PURPOSES = [
  "class_replay",
  "creator_library",
  "social_post",
  "ai_class",
] as const;

export type MuxVideoPurpose = (typeof MUX_VIDEO_PURPOSES)[number];

export const MUX_PLAYBACK_TOKEN_TTL = "2h";
export const MUX_DIRECT_UPLOAD_MAX_BYTES = 5 * 1024 * 1024 * 1024;
export const MUX_UPLOAD_TIMEOUT_SECONDS = 3600;

export type MuxAssetStatus = "waiting" | "preparing" | "ready" | "errored";

export function isMuxVideoPurpose(value: string): value is MuxVideoPurpose {
  return (MUX_VIDEO_PURPOSES as readonly string[]).includes(value);
}

export function muxHlsUrl(playbackId: string, token?: string): string {
  const base = `https://stream.mux.com/${playbackId}.m3u8`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function muxThumbnailUrl(playbackId: string, token?: string): string {
  const base = `https://image.mux.com/${playbackId}/thumbnail.webp`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function isMuxPlaybackId(value: string): boolean {
  return /^[A-Za-z0-9]{8,80}$/.test(value.trim());
}
