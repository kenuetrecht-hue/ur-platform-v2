/**
 * Mux Video — primary ingest and playback engine.
 * Token secret, webhook secret, and signing key stay server-only.
 */

import { createHmac, createPrivateKey, timingSafeEqual, randomUUID } from "crypto";
import { SignJWT } from "jose";
import { TRPCError } from "@trpc/server";
import {
  MUX_PLAYBACK_TOKEN_TTL,
  MUX_UPLOAD_TIMEOUT_SECONDS,
  muxHlsUrl,
  muxThumbnailUrl,
  type MuxAssetStatus,
  type MuxVideoPurpose,
} from "../../lib/mux-video-engine";
import { isAllowedBrowserOrigin } from "./api-security";
import { sanitizeUserText } from "./input-sanitize";
import {
  getMuxSigningKeyId,
  getMuxSigningPrivateKey,
  getMuxTokenId,
  getMuxTokenSecret,
  getMuxWebhookSecret,
  isMuxSigningConfigured,
  isMuxVideoConfigured,
} from "./secrets";

const MUX_API = "https://api.mux.com/video/v1";

export type MuxUploadRecord = {
  id: string;
  muxUploadId: string;
  uploadUrl: string;
  purpose: MuxVideoPurpose;
  ownerUserId: string;
  sessionId?: string;
  status: MuxAssetStatus;
  muxAssetId?: string;
  muxPlaybackId?: string;
  durationSeconds?: number;
  errorMessage?: string;
  createdAt: string;
};

export type MuxSignedPlayback = {
  engine: "mux";
  playbackId: string;
  token: string;
  hlsUrl: string;
  thumbnailUrl: string;
  expiresIn: typeof MUX_PLAYBACK_TOKEN_TTL;
};

type MuxPassthrough = {
  purpose: MuxVideoPurpose;
  ownerUserId: string;
  sessionId?: string;
  uploadRecordId: string;
};

type MuxFetch = typeof fetch;

let muxFetch: MuxFetch = fetch;
const uploads = new Map<string, MuxUploadRecord>();
const uploadsByMuxId = new Map<string, string>();
const uploadsByAssetId = new Map<string, string>();

export function getMuxEnginePublicStatus() {
  return {
    engine: "mux" as const,
    configured: isMuxVideoConfigured(),
    signingConfigured: isMuxSigningConfigured(),
    webhookConfigured: Boolean(getMuxWebhookSecret()),
  };
}

export function _setMuxFetchForTests(fn: MuxFetch): void {
  muxFetch = fn;
}

export function _resetMuxEngineForTests(): void {
  uploads.clear();
  uploadsByMuxId.clear();
  uploadsByAssetId.clear();
  muxFetch = fetch;
}

export function _seedMuxUploadForTests(record: MuxUploadRecord): MuxUploadRecord {
  uploads.set(record.id, record);
  uploadsByMuxId.set(record.muxUploadId, record.id);
  if (record.muxAssetId) uploadsByAssetId.set(record.muxAssetId, record.id);
  return record;
}

export function getMuxUpload(id: string): MuxUploadRecord | null {
  return uploads.get(id) ?? null;
}

export function getMuxUploadByMuxId(muxUploadId: string): MuxUploadRecord | null {
  const id = uploadsByMuxId.get(muxUploadId);
  return id ? uploads.get(id) ?? null : null;
}

export function getMuxUploadByAssetId(assetId: string): MuxUploadRecord | null {
  const id = uploadsByAssetId.get(assetId);
  return id ? uploads.get(id) ?? null : null;
}

export function getMuxUploadForSession(sessionId: string): MuxUploadRecord | null {
  return (
    [...uploads.values()]
      .filter((u) => u.sessionId === sessionId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null
  );
}

function assertMuxConfigured(): void {
  if (!isMuxVideoConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Mux is not configured. Add MUX_TOKEN_ID and MUX_TOKEN_SECRET in the server .env.",
    });
  }
}

function muxAuthHeader(): string {
  const token = Buffer.from(`${getMuxTokenId()}:${getMuxTokenSecret()}`).toString("base64");
  return `Basic ${token}`;
}

function resolveCorsOrigin(requestOrigin?: string): string {
  const origin = (requestOrigin ?? "").trim().replace(/\/+$/, "");
  if (!origin) return "*";
  if (isAllowedBrowserOrigin(origin)) return origin;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Upload origin is not allowed.",
  });
}

async function muxRequest<T>(path: string, init?: RequestInit): Promise<T> {
  assertMuxConfigured();
  let response: Response;
  try {
    response = await muxFetch(`${MUX_API}${path}`, {
      ...init,
      headers: {
        Authorization: muxAuthHeader(),
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Mux video engine is unreachable.",
    });
  }
  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Mux video engine rejected the request.",
    });
  }
  return (await response.json()) as T;
}

export async function createMuxDirectUpload(params: {
  purpose: MuxVideoPurpose;
  ownerUserId: string;
  sessionId?: string;
  requestOrigin?: string;
}): Promise<MuxUploadRecord> {
  assertMuxConfigured();
  const recordId = randomUUID();
  const passthrough: MuxPassthrough = {
    purpose: params.purpose,
    ownerUserId: params.ownerUserId,
    sessionId: params.sessionId,
    uploadRecordId: recordId,
  };
  const created = await muxRequest<{
    data: { id: string; url: string; timeout?: number };
  }>("/uploads", {
    method: "POST",
    body: JSON.stringify({
      cors_origin: resolveCorsOrigin(params.requestOrigin),
      timeout: MUX_UPLOAD_TIMEOUT_SECONDS,
      new_asset_settings: {
        playback_policy: ["signed"],
        passthrough: JSON.stringify(passthrough),
      },
    }),
  });

  const record: MuxUploadRecord = {
    id: recordId,
    muxUploadId: created.data.id,
    uploadUrl: created.data.url,
    purpose: params.purpose,
    ownerUserId: params.ownerUserId,
    sessionId: params.sessionId,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };
  uploads.set(record.id, record);
  uploadsByMuxId.set(record.muxUploadId, record.id);
  return record;
}

export function publicMuxUpload(record: MuxUploadRecord) {
  return {
    id: record.id,
    muxUploadId: record.muxUploadId,
    uploadUrl: record.uploadUrl,
    purpose: record.purpose,
    sessionId: record.sessionId,
    status: record.status,
    muxAssetId: record.muxAssetId,
    ready: record.status === "ready" && Boolean(record.muxPlaybackId),
    createdAt: record.createdAt,
  };
}

function parsePassthrough(raw: unknown): MuxPassthrough | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as MuxPassthrough;
    if (!parsed.uploadRecordId || !parsed.ownerUserId || !parsed.purpose) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type MuxWebhookApplyResult = {
  handled: boolean;
  upload?: MuxUploadRecord;
  sessionId?: string;
};

export function applyMuxAssetEvent(params: {
  type: string;
  assetId?: string;
  uploadId?: string;
  playbackId?: string;
  durationSeconds?: number;
  passthrough?: unknown;
  errored?: boolean;
}): MuxWebhookApplyResult {
  const passthrough = parsePassthrough(params.passthrough);
  const byRecord = passthrough?.uploadRecordId ? uploads.get(passthrough.uploadRecordId) : null;
  const byUpload = params.uploadId ? getMuxUploadByMuxId(params.uploadId) : null;
  const byAsset = params.assetId ? getMuxUploadByAssetId(params.assetId) : null;
  const record = byRecord ?? byUpload ?? byAsset;
  if (!record) {
    return { handled: false };
  }
  if (params.errored) {
    record.status = "errored";
    record.errorMessage = "Mux could not process this video.";
    uploads.set(record.id, record);
    return { handled: true, upload: record, sessionId: record.sessionId };
  }
  if (params.assetId) {
    record.muxAssetId = params.assetId;
    uploadsByAssetId.set(params.assetId, record.id);
  }
  if (params.playbackId) {
    record.muxPlaybackId = params.playbackId;
  }
  if (typeof params.durationSeconds === "number" && Number.isFinite(params.durationSeconds)) {
    record.durationSeconds = params.durationSeconds;
  }
  if (params.type.includes("ready") || (record.muxAssetId && record.muxPlaybackId)) {
    record.status = "ready";
  } else {
    record.status = "preparing";
  }
  uploads.set(record.id, record);
  return { handled: true, upload: record, sessionId: record.sessionId };
}

export function verifyMuxWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = getMuxWebhookSecret();
  if (!secret || !signatureHeader.trim()) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const idx = part.indexOf("=");
      return [part.slice(0, idx).trim(), part.slice(idx + 1).trim()];
    }),
  ) as Record<string, string>;
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseMuxWebhookEvent(payload: unknown): {
  type: string;
  assetId?: string;
  uploadId?: string;
  playbackId?: string;
  durationSeconds?: number;
  passthrough?: unknown;
  errored: boolean;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as {
    type?: string;
    data?: {
      id?: string;
      status?: string;
      duration?: number;
      passthrough?: unknown;
      playback_ids?: Array<{ id?: string; policy?: string }>;
      asset_id?: string;
      error?: unknown;
    };
  };
  const type = sanitizeUserText(body.type ?? "", 80);
  if (!type.startsWith("video.")) return null;
  const data = body.data ?? {};
  const playbackId =
    data.playback_ids?.find((p) => p.policy === "signed")?.id ?? data.playback_ids?.[0]?.id;
  return {
    type,
    assetId: type.includes("asset") ? data.id : data.asset_id,
    uploadId: type.includes("upload") ? data.id : undefined,
    playbackId,
    durationSeconds: typeof data.duration === "number" ? data.duration : undefined,
    passthrough: data.passthrough,
    errored: type.includes("errored") || data.status === "errored",
  };
}

function decodeSigningKeyPem(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("BEGIN")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  return Buffer.from(trimmed, "base64").toString("utf8");
}

export async function signMuxPlayback(playbackId: string): Promise<MuxSignedPlayback> {
  if (!isMuxSigningConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Mux signing keys are not configured. Pay-per-view playback stays locked until they are set.",
    });
  }
  const key = createPrivateKey(decodeSigningKeyPem(getMuxSigningPrivateKey()));
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: getMuxSigningKeyId() })
    .setSubject(playbackId)
    .setAudience("v")
    .setExpirationTime(MUX_PLAYBACK_TOKEN_TTL)
    .sign(key);
  return {
    engine: "mux",
    playbackId,
    token,
    hlsUrl: muxHlsUrl(playbackId, token),
    thumbnailUrl: muxThumbnailUrl(playbackId),
    expiresIn: MUX_PLAYBACK_TOKEN_TTL,
  };
}

export async function signMuxPlaybackIfReady(record: MuxUploadRecord | null): Promise<MuxSignedPlayback | null> {
  if (!record?.muxPlaybackId || record.status !== "ready") return null;
  return signMuxPlayback(record.muxPlaybackId);
}
