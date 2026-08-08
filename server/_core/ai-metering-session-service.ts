/**
 * Active voice/video metering sessions — bill only connected playback milliseconds.
 * Pauses automatically on disconnect (missed heartbeat). Resumes without balance loss.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  clampBillableMs,
  METER_DISCONNECT_PAUSE_THRESHOLD_MS,
  METER_PAUSED_SESSION_TTL_MS,
} from "../../lib/ai-metering-policy";
import {
  assertTalkTimeAvailable,
  consumeTalkTimeMs,
  getTalkMillisecondsRemaining,
  type SpeechUsageRecord,
} from "./ai-talk-time-tracker";

export type MeterSessionKind = "voice_playback" | "video_talk";

export type ActiveMeterSession = {
  id: string;
  userId: string;
  creatorId: string;
  kind: MeterSessionKind;
  maxBillableMs: number;
  billableConnectedMs: number;
  playbackPositionMs: number;
  millisecondsRemainingAtStart: number;
  status: "running" | "paused" | "finalized";
  source: SpeechUsageRecord["source"];
  startedAt: string;
  lastHeartbeatAtMs: number;
  lastConnectedTickAtMs: number | null;
  pausedAt: string | null;
  finalizedAt: string | null;
  pauseReason: "disconnect" | "user" | "auto" | null;
  speechUsageId: string | null;
};

const sessions = new Map<string, ActiveMeterSession>();

function nowMs(): number {
  return Date.now();
}

function findOpenSessionForUser(userId: string): ActiveMeterSession | null {
  for (const session of sessions.values()) {
    if (session.userId === userId && session.status !== "finalized") {
      return session;
    }
  }
  return null;
}

function getSessionForUser(sessionId: string, userId: string): ActiveMeterSession {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Meter session not found." });
  }
  return session;
}

function flushRunningTick(session: ActiveMeterSession, at = nowMs()): void {
  if (session.status !== "running" || session.lastConnectedTickAtMs == null) return;
  const delta = Math.max(0, at - session.lastConnectedTickAtMs);
  session.billableConnectedMs += delta;
  session.lastConnectedTickAtMs = at;
}

function sweepStaleSessions(at = nowMs()): void {
  for (const session of sessions.values()) {
    if (session.status === "finalized") continue;

    if (
      session.status === "running" &&
      at - session.lastHeartbeatAtMs > METER_DISCONNECT_PAUSE_THRESHOLD_MS
    ) {
      flushRunningTick(session, session.lastHeartbeatAtMs);
      session.status = "paused";
      session.lastConnectedTickAtMs = null;
      session.pausedAt = new Date(session.lastHeartbeatAtMs).toISOString();
      session.pauseReason = "disconnect";
      sessions.set(session.id, session);
      continue;
    }

    if (
      session.status === "paused" &&
      session.pausedAt &&
      at - Date.parse(session.pausedAt) > METER_PAUSED_SESSION_TTL_MS
    ) {
      finalizeMeterSession({
        sessionId: session.id,
        userId: session.userId,
        playbackPositionMs: session.playbackPositionMs,
        reason: "auto_ttl",
      });
    }
  }
}

export function startMeterSession(params: {
  userId: string;
  creatorId: string;
  kind: MeterSessionKind;
  maxBillableMs: number;
  source?: SpeechUsageRecord["source"];
}): ActiveMeterSession {
  sweepStaleSessions();

  const existing = findOpenSessionForUser(params.userId);
  if (existing) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Finish or pause the current voice/video session before starting another.",
    });
  }

  const maxBillableMs = Math.max(1, Math.ceil(params.maxBillableMs));
  assertTalkTimeAvailable(params.userId, 1);

  const at = nowMs();
  const balance = getTalkMillisecondsRemaining(params.userId);
  const session: ActiveMeterSession = {
    id: `meter-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    creatorId: params.creatorId,
    kind: params.kind,
    maxBillableMs,
    billableConnectedMs: 0,
    playbackPositionMs: 0,
    millisecondsRemainingAtStart: balance,
    status: "running",
    source: params.source ?? (params.kind === "video_talk" ? "video_session" : "client_playback"),
    startedAt: new Date(at).toISOString(),
    lastHeartbeatAtMs: at,
    lastConnectedTickAtMs: at,
    pausedAt: null,
    finalizedAt: null,
    pauseReason: null,
    speechUsageId: null,
  };

  sessions.set(session.id, session);
  return session;
}

export function heartbeatMeterSession(params: {
  sessionId: string;
  userId: string;
  playbackPositionMs: number;
  clientOnline?: boolean;
}): {
  session: ActiveMeterSession;
  millisecondsRemaining: number;
  projectedRemainingMs: number;
} {
  sweepStaleSessions();
  const session = getSessionForUser(params.sessionId, params.userId);
  if (session.status === "finalized") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Meter session already finalized." });
  }

  const at = nowMs();
  const online = params.clientOnline !== false;

  if (!online) {
    if (session.status === "running") {
      flushRunningTick(session, at);
      session.status = "paused";
      session.lastConnectedTickAtMs = null;
      session.pausedAt = new Date(at).toISOString();
      session.pauseReason = "disconnect";
    }
  } else if (session.status === "paused") {
    session.status = "running";
    session.lastConnectedTickAtMs = at;
    session.pausedAt = null;
    session.pauseReason = null;
  } else if (session.status === "running") {
    flushRunningTick(session, at);
    session.lastConnectedTickAtMs = at;
  }

  session.playbackPositionMs = Math.max(0, Math.floor(params.playbackPositionMs));
  session.lastHeartbeatAtMs = at;
  sessions.set(session.id, session);

  const balance = getTalkMillisecondsRemaining(params.userId);
  const pending = session.billableConnectedMs;
  return {
    session,
    millisecondsRemaining: balance,
    projectedRemainingMs: Math.max(0, balance - pending),
  };
}

export function pauseMeterSession(params: {
  sessionId: string;
  userId: string;
  playbackPositionMs: number;
  reason?: "disconnect" | "user" | "auto";
}): ActiveMeterSession {
  sweepStaleSessions();
  const session = getSessionForUser(params.sessionId, params.userId);
  if (session.status === "finalized") return session;

  const at = nowMs();
  flushRunningTick(session, at);
  session.status = "paused";
  session.lastConnectedTickAtMs = null;
  session.pausedAt = new Date(at).toISOString();
  session.pauseReason = params.reason ?? "user";
  session.playbackPositionMs = Math.max(0, Math.floor(params.playbackPositionMs));
  session.lastHeartbeatAtMs = at;
  sessions.set(session.id, session);
  return session;
}

export function resumeMeterSession(params: {
  sessionId: string;
  userId: string;
  playbackPositionMs: number;
}): ActiveMeterSession {
  sweepStaleSessions();
  const session = getSessionForUser(params.sessionId, params.userId);
  if (session.status === "finalized") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Meter session already finalized." });
  }

  const at = nowMs();
  session.status = "running";
  session.lastConnectedTickAtMs = at;
  session.pausedAt = null;
  session.pauseReason = null;
  session.playbackPositionMs = Math.max(0, Math.floor(params.playbackPositionMs));
  session.lastHeartbeatAtMs = at;
  sessions.set(session.id, session);
  return session;
}

export function finalizeMeterSession(params: {
  sessionId: string;
  userId: string;
  playbackPositionMs: number;
  reason?: "playback_end" | "user_stop" | "auto_ttl";
}): {
  session: ActiveMeterSession;
  billedMs: number;
  millisecondsRemaining: number;
  speechUsageId: string | null;
} {
  sweepStaleSessions();
  const session = getSessionForUser(params.sessionId, params.userId);
  if (session.status === "finalized") {
    return {
      session,
      billedMs: 0,
      millisecondsRemaining: getTalkMillisecondsRemaining(params.userId),
      speechUsageId: session.speechUsageId,
    };
  }

  const at = nowMs();
  flushRunningTick(session, at);
  session.playbackPositionMs = Math.max(0, Math.floor(params.playbackPositionMs));

  const balance = getTalkMillisecondsRemaining(params.userId);
  const connectedMs = session.billableConnectedMs;
  const billedMs = clampBillableMs({
    connectedMs,
    maxSessionMs: session.maxBillableMs,
    balanceMs: balance,
  });

  let speechUsageId: string | null = null;
  if (billedMs > 0) {
    const usage = consumeTalkTimeMs({
      userId: params.userId,
      creatorId: session.creatorId,
      durationMs: billedMs,
      source: session.source,
      startedAtMs: Date.parse(session.startedAt),
    });
    speechUsageId = usage.id;
    session.speechUsageId = usage.id;
  }

  session.status = "finalized";
  session.finalizedAt = new Date(at).toISOString();
  session.lastConnectedTickAtMs = null;
  sessions.set(session.id, session);

  return {
    session,
    billedMs,
    millisecondsRemaining: getTalkMillisecondsRemaining(params.userId),
    speechUsageId,
  };
}

export function getMeterSessionStatus(params: {
  sessionId: string;
  userId: string;
}): {
  session: ActiveMeterSession;
  millisecondsRemaining: number;
  projectedRemainingMs: number;
  isPaused: boolean;
} {
  sweepStaleSessions();
  const session = getSessionForUser(params.sessionId, params.userId);
  const balance = getTalkMillisecondsRemaining(params.userId);
  const pending =
    session.status === "finalized" ? 0 : Math.min(session.billableConnectedMs, session.maxBillableMs);
  return {
    session,
    millisecondsRemaining: balance,
    projectedRemainingMs: Math.max(0, balance - pending),
    isPaused: session.status === "paused",
  };
}

export function getOpenMeterSession(userId: string): ActiveMeterSession | null {
  sweepStaleSessions();
  return findOpenSessionForUser(userId);
}

/** Test helper */
export function _clearMeterSessionsForTests(): void {
  sessions.clear();
}
