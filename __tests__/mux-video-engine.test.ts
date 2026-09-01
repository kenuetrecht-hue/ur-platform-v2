import { generateKeyPairSync } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyMuxAssetEvent,
  createMuxDirectUpload,
  getMuxEnginePublicStatus,
  parseMuxWebhookEvent,
  publicMuxUpload,
  signMuxPlayback,
  verifyMuxWebhookSignature,
  _resetMuxEngineForTests,
  _seedMuxUploadForTests,
  _setMuxFetchForTests,
} from "../server/_core/mux-video-engine";
import {
  attachMuxPlaybackToSession,
  getReplayWatchAccess,
  getReplayWatchPlayback,
  publishClassReplay,
  publicReplay,
  _resetClassReplaysForTests,
} from "../server/_core/class-replay-service";
import { setAiSessionProgram } from "../server/_core/ai-session-programming";
import { scheduleLiveSession, _forceSessionEndedForTests } from "../server/_core/ai-live-session-service";
import { LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS } from "../lib/live-class-scheduling-policy";

const savedEnv = { ...process.env };

function futureStart(): string {
  return new Date(Date.now() + LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS + 60 * 60 * 1000).toISOString();
}

describe("mux video engine", () => {
  beforeEach(() => {
    _resetMuxEngineForTests();
    _resetClassReplaysForTests();
    process.env.MUX_TOKEN_ID = "";
    process.env.MUX_TOKEN_SECRET = "";
    process.env.MUX_WEBHOOK_SECRET = "";
    process.env.MUX_SIGNING_KEY_ID = "";
    process.env.MUX_SIGNING_PRIVATE_KEY = "";
  });

  afterEach(() => {
    _resetMuxEngineForTests();
    process.env.MUX_TOKEN_ID = savedEnv.MUX_TOKEN_ID ?? "";
    process.env.MUX_TOKEN_SECRET = savedEnv.MUX_TOKEN_SECRET ?? "";
    process.env.MUX_WEBHOOK_SECRET = savedEnv.MUX_WEBHOOK_SECRET ?? "";
    process.env.MUX_SIGNING_KEY_ID = savedEnv.MUX_SIGNING_KEY_ID ?? "";
    process.env.MUX_SIGNING_PRIVATE_KEY = savedEnv.MUX_SIGNING_PRIVATE_KEY ?? "";
  });

  it("reports Mux as the primary engine without leaking secrets", () => {
    const status = getMuxEnginePublicStatus();
    expect(status.engine).toBe("mux");
    expect(status.configured).toBe(false);
    expect(JSON.stringify(status)).not.toMatch(/secret|private/i);
  });

  it("refuses uploads when Mux tokens are missing", async () => {
    await expect(
      createMuxDirectUpload({
        purpose: "class_replay",
        ownerUserId: "creator-1",
        sessionId: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toThrow(/not configured/);
  });

  it("creates a signed-policy direct upload through Mux", async () => {
    process.env.MUX_TOKEN_ID = "tid";
    process.env.MUX_TOKEN_SECRET = "tsec";
    _setMuxFetchForTests(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        new_asset_settings?: { playback_policy?: string[] };
      };
      expect(body.new_asset_settings?.playback_policy).toEqual(["signed"]);
      return new Response(JSON.stringify({ data: { id: "upload_mux_1", url: "https://storage.googleapis.com/mux" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const upload = await createMuxDirectUpload({
      purpose: "class_replay",
      ownerUserId: "creator-1",
      sessionId: "00000000-0000-4000-8000-000000000001",
    });
    expect(upload.muxUploadId).toBe("upload_mux_1");
    expect(upload.uploadUrl).toContain("https://");
    expect(publicMuxUpload(upload).ready).toBe(false);
  });

  it("verifies Mux webhook signatures and rejects stale or wrong ones", () => {
    process.env.MUX_WEBHOOK_SECRET = "whsec_test";
    const raw = JSON.stringify({ type: "video.asset.ready", data: { id: "asset1" } });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const { createHmac } = require("crypto") as typeof import("crypto");
    const good = createHmac("sha256", "whsec_test").update(`${timestamp}.${raw}`).digest("hex");
    expect(verifyMuxWebhookSignature(raw, `t=${timestamp},v1=${good}`)).toBe(true);
    expect(verifyMuxWebhookSignature(raw, `t=${timestamp},v1=deadbeef`)).toBe(false);
    expect(verifyMuxWebhookSignature(raw, `t=1,v1=${good}`)).toBe(false);
  });

  it("parses asset.ready and attaches signed playback to a published replay", () => {
    setAiSessionProgram({
      creatorAiId: "ai-coder-001",
      enabled: true,
      durationMinutes: 30,
      priceCentsPerMinute: 20,
      maxAttendees: 100,
    });
    const session = scheduleLiveSession({
      creatorAiId: "ai-coder-001",
      startsAt: futureStart(),
      hostUserId: "creator-1",
    });
    _forceSessionEndedForTests(session.id);
    const seeded = _seedMuxUploadForTests({
      id: "11111111-1111-4111-8111-111111111111",
      muxUploadId: "upload_mux_1",
      uploadUrl: "https://storage.googleapis.com/mux",
      purpose: "class_replay",
      ownerUserId: "creator-1",
      sessionId: session.id,
      status: "waiting",
      createdAt: new Date().toISOString(),
    });
    const replay = publishClassReplay({
      sessionId: session.id,
      userId: "creator-1",
      isPlatformOwner: false,
      priceCents: 299,
      muxUploadId: seeded.id,
    });
    const event = parseMuxWebhookEvent({
      type: "video.asset.ready",
      data: {
        id: "asset_ready_1",
        duration: 1800,
        passthrough: JSON.stringify({
          purpose: "class_replay",
          ownerUserId: "creator-1",
          sessionId: session.id,
          uploadRecordId: seeded.id,
        }),
        playback_ids: [{ id: "playback_signed_1", policy: "signed" }],
      },
    });
    expect(event?.playbackId).toBe("playback_signed_1");
    applyMuxAssetEvent(event!);
    const attached = attachMuxPlaybackToSession({
      sessionId: session.id,
      muxUploadId: seeded.id,
      muxAssetId: "asset_ready_1",
      muxPlaybackId: "playback_signed_1",
      durationSeconds: 1800,
    });
    expect(attached?.muxStatus).toBe("ready");
    expect(publicReplay(replay).videoEngine).toBe("mux");
    expect(publicReplay(attached!).hasVideoFile).toBe(true);
    expect(JSON.stringify(publicReplay(attached!))).not.toContain("playback_signed_1");
  });

  it("does not sign playback for someone who has not paid", async () => {
    setAiSessionProgram({
      creatorAiId: "ai-coder-001",
      enabled: true,
      durationMinutes: 30,
      priceCentsPerMinute: 20,
      maxAttendees: 100,
    });
    const session = scheduleLiveSession({
      creatorAiId: "ai-coder-001",
      startsAt: futureStart(),
      hostUserId: "creator-1",
    });
    _forceSessionEndedForTests(session.id);
    const replay = publishClassReplay({
      sessionId: session.id,
      userId: "creator-1",
      isPlatformOwner: false,
      priceCents: 299,
    });
    attachMuxPlaybackToSession({
      sessionId: session.id,
      muxPlaybackId: "playback_paid_only",
    });
    expect(
      userHasNoPlayback(replay.id),
    ).toBe(true);
    const playback = await getReplayWatchPlayback({
      replayId: replay.id,
      userId: "stranger",
      isPlatformOwner: false,
    });
    expect(playback).toBeNull();
  });

  it("signs a Mux playback token when signing keys are present", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.MUX_SIGNING_KEY_ID = "keyid_test";
    process.env.MUX_SIGNING_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const signed = await signMuxPlayback("playbackABC123");
    expect(signed.engine).toBe("mux");
    expect(signed.playbackId).toBe("playbackABC123");
    expect(signed.hlsUrl).toContain("stream.mux.com/playbackABC123.m3u8");
    expect(signed.token.length).toBeGreaterThan(20);
  });
});

function userHasNoPlayback(replayId: string): boolean {
  const access = getReplayWatchAccess({
    replayId,
    userId: "stranger",
    isPlatformOwner: false,
  });
  return access.allowed === false;
}
