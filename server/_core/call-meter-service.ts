/**
 * Millisecond call meter — every join, heartbeat, and hangup is stamped.
 * Capture/void decisions use this timeline so cost matches time on the call.
 */

export const CALL_HEARTBEAT_STALE_MS = 4_000;

export type CallMeterEventType =
  | "created"
  | "caller_join"
  | "callee_join"
  | "heartbeat"
  | "connected"
  | "ended";

export type CallMeterEvent = {
  tMs: number;
  type: CallMeterEventType;
  userId?: string;
};

export type CallMeterSnapshot = {
  roomId: string;
  createdMs: number;
  callerJoinedMs: number | null;
  calleeJoinedMs: number | null;
  connectedStartMs: number | null;
  endedMs: number | null;
  lastCallerHeartbeatMs: number | null;
  lastCalleeHeartbeatMs: number | null;
  /** Wall time both people were on the call, in milliseconds. */
  connectedMs: number;
  bothConnected: boolean;
  events: CallMeterEvent[];
};

const meters = new Map<string, CallMeterSnapshot>();

export function nowCallMs(): number {
  return Date.now();
}

export function _resetCallMetersForTests(): void {
  meters.clear();
}

function roleFor(meter: CallMeterSnapshot, userId: string, callerUserId: string, calleeUserId: string): "caller" | "callee" | null {
  if (userId === callerUserId) return "caller";
  if (userId === calleeUserId) return "callee";
  return null;
}

function pushEvent(meter: CallMeterSnapshot, event: CallMeterEvent): void {
  meter.events.push(event);
  if (meter.events.length > 2_000) {
    meter.events = meter.events.slice(-1_500);
  }
}

function recomputeConnected(meter: CallMeterSnapshot): void {
  if (meter.callerJoinedMs != null && meter.calleeJoinedMs != null && meter.connectedStartMs == null) {
    meter.connectedStartMs = Math.max(meter.callerJoinedMs, meter.calleeJoinedMs);
    pushEvent(meter, { tMs: meter.connectedStartMs, type: "connected" });
  }
  meter.bothConnected = meter.connectedStartMs != null && meter.endedMs == null;
  if (meter.connectedStartMs == null) {
    meter.connectedMs = 0;
    return;
  }
  const endMs =
    meter.endedMs ??
    (meter.lastCallerHeartbeatMs != null && meter.lastCalleeHeartbeatMs != null
      ? Math.min(meter.lastCallerHeartbeatMs, meter.lastCalleeHeartbeatMs)
      : nowCallMs());
  meter.connectedMs = Math.max(0, endMs - meter.connectedStartMs);
}

export function startCallMeter(params: { roomId: string; createdMs?: number }): CallMeterSnapshot {
  const existing = meters.get(params.roomId);
  if (existing) return existing;
  const createdMs = params.createdMs ?? nowCallMs();
  const meter: CallMeterSnapshot = {
    roomId: params.roomId,
    createdMs,
    callerJoinedMs: null,
    calleeJoinedMs: null,
    connectedStartMs: null,
    endedMs: null,
    lastCallerHeartbeatMs: null,
    lastCalleeHeartbeatMs: null,
    connectedMs: 0,
    bothConnected: false,
    events: [{ tMs: createdMs, type: "created" }],
  };
  meters.set(params.roomId, meter);
  return meter;
}

export function markCallJoin(params: {
  roomId: string;
  userId: string;
  callerUserId: string;
  calleeUserId: string;
  atMs?: number;
}): CallMeterSnapshot {
  const meter = startCallMeter({ roomId: params.roomId, createdMs: params.atMs });
  if (meter.endedMs != null) return meter;
  const atMs = params.atMs ?? nowCallMs();
  const role = roleFor(meter, params.userId, params.callerUserId, params.calleeUserId);
  if (!role) return meter;
  if (role === "caller") {
    meter.callerJoinedMs = meter.callerJoinedMs ?? atMs;
    meter.lastCallerHeartbeatMs = atMs;
    pushEvent(meter, { tMs: atMs, type: "caller_join", userId: params.userId });
  } else {
    meter.calleeJoinedMs = meter.calleeJoinedMs ?? atMs;
    meter.lastCalleeHeartbeatMs = atMs;
    pushEvent(meter, { tMs: atMs, type: "callee_join", userId: params.userId });
  }
  recomputeConnected(meter);
  meters.set(params.roomId, meter);
  return meter;
}

export function heartbeatCall(params: {
  roomId: string;
  userId: string;
  callerUserId: string;
  calleeUserId: string;
  atMs?: number;
}): CallMeterSnapshot {
  const meter = startCallMeter({ roomId: params.roomId });
  if (meter.endedMs != null) return meter;
  const atMs = params.atMs ?? nowCallMs();
  const role = roleFor(meter, params.userId, params.callerUserId, params.calleeUserId);
  if (!role) return meter;
  if (role === "caller") meter.lastCallerHeartbeatMs = atMs;
  else meter.lastCalleeHeartbeatMs = atMs;
  pushEvent(meter, { tMs: atMs, type: "heartbeat", userId: params.userId });
  if (meter.callerJoinedMs == null && role === "caller") meter.callerJoinedMs = atMs;
  if (meter.calleeJoinedMs == null && role === "callee") meter.calleeJoinedMs = atMs;
  recomputeConnected(meter);
  meters.set(params.roomId, meter);
  return meter;
}

export function endCallMeter(params: { roomId: string; atMs?: number }): CallMeterSnapshot {
  const meter = startCallMeter({ roomId: params.roomId });
  if (meter.endedMs != null) {
    recomputeConnected(meter);
    return meter;
  }
  const atMs = params.atMs ?? nowCallMs();
  meter.endedMs = atMs;
  pushEvent(meter, { tMs: atMs, type: "ended" });
  recomputeConnected(meter);
  meters.set(params.roomId, meter);
  return meter;
}

export function getCallMeter(roomId: string): CallMeterSnapshot | null {
  const meter = meters.get(roomId);
  if (!meter) return null;
  if (meter.endedMs == null) recomputeConnected(meter);
  return meter;
}

export function wasCallAnswered(meter: CallMeterSnapshot): boolean {
  return meter.callerJoinedMs != null && meter.calleeJoinedMs != null && meter.connectedStartMs != null;
}

export function peersStillLive(meter: CallMeterSnapshot, nowMs = nowCallMs()): boolean {
  if (meter.endedMs != null) return false;
  if (meter.lastCallerHeartbeatMs == null || meter.lastCalleeHeartbeatMs == null) return false;
  return (
    nowMs - meter.lastCallerHeartbeatMs <= CALL_HEARTBEAT_STALE_MS &&
    nowMs - meter.lastCalleeHeartbeatMs <= CALL_HEARTBEAT_STALE_MS
  );
}
