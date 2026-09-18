/**
 * 1-to-1 video call rooms — in-memory signaling + millisecond meter.
 * Friend calls are free. Creator 1-to-1 calls hold the card, then capture
 * only after both people are on the call.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { listFriends } from "./social-service";
import { consumeCreatorCallTicket } from "./creator-call-ticket-service";
import {
  endCallMeter,
  getCallMeter,
  heartbeatCall,
  markCallJoin,
  nowCallMs,
  startCallMeter,
  type CallMeterSnapshot,
} from "./call-meter-service";

export type VideoCallStatus = "ringing" | "active" | "ended";
export type VideoCallKind = "friend" | "creator";

export type VideoCallRoom = {
  id: string;
  kind: VideoCallKind;
  callerUserId: string;
  calleeUserId: string;
  status: VideoCallStatus;
  createdAt: string;
  createdAtMs: number;
  startedAt?: string;
  startedAtMs?: number;
  endedAt?: string;
  endedAtMs?: number;
  paidCents?: number;
  ticketId?: string;
  paymentIntentId?: string;
  callerJoinedAtMs?: number;
  calleeJoinedAtMs?: number;
  connectedMs?: number;
  offerSdp?: string;
  answerSdp?: string;
  iceCandidates: Array<{ fromUserId: string; candidate: string }>;
};

const rooms = new Map<string, VideoCallRoom>();

export function _resetVideoCallsForTests(): void {
  rooms.clear();
}

function assertFriends(userA: string, userB: string): void {
  const friends = listFriends(userA);
  const ok = friends.some((f) => f.peerUserId === userB);
  if (!ok) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Video chat is only available with accepted friends.",
    });
  }
}

function assertParticipant(room: VideoCallRoom, userId: string): void {
  if (userId !== room.callerUserId && userId !== room.calleeUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant in this call." });
  }
}

export function requireCallParticipant(roomId: string, userId: string): VideoCallRoom {
  const room = rooms.get(roomId);
  if (!room) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Video call not found." });
  }
  assertParticipant(room, userId);
  return room;
}

export function requireLiveCallParticipant(roomId: string, userId: string): VideoCallRoom {
  const room = requireCallParticipant(roomId, userId);
  if (room.status === "ended") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This call has ended." });
  }
  return room;
}

function applyMeter(room: VideoCallRoom, meter: CallMeterSnapshot): VideoCallRoom {
  room.callerJoinedAtMs = meter.callerJoinedMs ?? room.callerJoinedAtMs;
  room.calleeJoinedAtMs = meter.calleeJoinedMs ?? room.calleeJoinedAtMs;
  room.connectedMs = meter.connectedMs;
  if (meter.calleeJoinedMs != null && room.status === "ringing") {
    room.status = "active";
    const startMs = meter.connectedStartMs ?? meter.calleeJoinedMs;
    room.startedAtMs = startMs;
    room.startedAt = new Date(startMs).toISOString();
  }
  if (meter.endedMs != null) {
    room.status = "ended";
    room.endedAtMs = meter.endedMs;
    room.endedAt = new Date(meter.endedMs).toISOString();
    room.connectedMs = meter.connectedMs;
  }
  rooms.set(room.id, room);
  return room;
}

function putRoom(params: {
  kind: VideoCallKind;
  callerUserId: string;
  calleeUserId: string;
  paidCents?: number;
  ticketId?: string;
  paymentIntentId?: string;
}): VideoCallRoom {
  if (params.callerUserId === params.calleeUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot call yourself." });
  }
  const createdAtMs = nowCallMs();
  const room: VideoCallRoom = {
    id: randomUUID(),
    kind: params.kind,
    callerUserId: params.callerUserId,
    calleeUserId: params.calleeUserId,
    status: "ringing",
    createdAt: new Date(createdAtMs).toISOString(),
    createdAtMs,
    iceCandidates: [],
    paidCents: params.paidCents,
    ticketId: params.ticketId,
    paymentIntentId: params.paymentIntentId,
  };
  rooms.set(room.id, room);
  startCallMeter({ roomId: room.id, createdMs: createdAtMs });
  return room;
}

export function createVideoCall(params: {
  callerUserId: string;
  calleeUserId: string;
}): VideoCallRoom {
  assertFriends(params.callerUserId, params.calleeUserId);
  return putRoom({
    kind: "friend",
    callerUserId: params.callerUserId,
    calleeUserId: params.calleeUserId,
  });
}

export function createCreatorVideoCall(params: {
  callerUserId: string;
  creatorUserId: string;
}): VideoCallRoom {
  const ticket = consumeCreatorCallTicket({
    buyerUserId: params.callerUserId,
    creatorUserId: params.creatorUserId,
  });
  return putRoom({
    kind: "creator",
    callerUserId: params.callerUserId,
    calleeUserId: params.creatorUserId,
    paidCents: ticket.priceCents,
    ticketId: ticket.id,
    paymentIntentId: ticket.paymentIntentId,
  });
}

export function toPublicVideoCall(room: VideoCallRoom): Omit<VideoCallRoom, "ticketId" | "paymentIntentId"> {
  const { ticketId: _ticketId, paymentIntentId: _paymentIntentId, ...safe } = room;
  return safe;
}

export function getVideoCallRoom(roomId: string): VideoCallRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const meter = getCallMeter(roomId);
  if (meter) applyMeter(room, meter);
  return room;
}

export function joinVideoCall(params: {
  roomId: string;
  userId: string;
}): VideoCallRoom {
  const room = rooms.get(params.roomId);
  if (!room) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Video call not found." });
  }
  assertParticipant(room, params.userId);
  if (room.status === "ended") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This call has ended." });
  }
  const meter = markCallJoin({
    roomId: room.id,
    userId: params.userId,
    callerUserId: room.callerUserId,
    calleeUserId: room.calleeUserId,
  });
  return applyMeter(room, meter);
}

export function heartbeatVideoCall(params: {
  roomId: string;
  userId: string;
}): VideoCallRoom {
  const room = requireCallParticipant(params.roomId, params.userId);
  if (room.status === "ended") return room;
  const meter = heartbeatCall({
    roomId: room.id,
    userId: params.userId,
    callerUserId: room.callerUserId,
    calleeUserId: room.calleeUserId,
  });
  return applyMeter(room, meter);
}

export function endVideoCall(params: { roomId: string; userId: string }): VideoCallRoom {
  const room = rooms.get(params.roomId);
  if (!room) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Video call not found." });
  }
  assertParticipant(room, params.userId);
  const meter = endCallMeter({ roomId: room.id });
  return applyMeter(room, meter);
}

export function setVideoOffer(roomId: string, userId: string, sdp: string): VideoCallRoom {
  const room = requireLiveCallParticipant(roomId, userId);
  if (userId !== room.callerUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the caller sends the offer." });
  }
  room.offerSdp = sdp.slice(0, 50000);
  rooms.set(roomId, room);
  return room;
}

export function setVideoAnswer(roomId: string, userId: string, sdp: string): VideoCallRoom {
  const room = requireLiveCallParticipant(roomId, userId);
  if (userId !== room.calleeUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the callee sends the answer." });
  }
  room.answerSdp = sdp.slice(0, 50000);
  rooms.set(roomId, room);
  return room;
}

export function addIceCandidate(params: {
  roomId: string;
  userId: string;
  candidate: string;
}): VideoCallRoom {
  const room = requireLiveCallParticipant(params.roomId, params.userId);
  room.iceCandidates.push({
    fromUserId: params.userId,
    candidate: params.candidate.slice(0, 8000),
  });
  if (room.iceCandidates.length > 50) {
    room.iceCandidates = room.iceCandidates.slice(-50);
  }
  rooms.set(room.id, room);
  return room;
}

export function listIncomingCalls(userId: string): VideoCallRoom[] {
  return [...rooms.values()].filter(
    (r) => r.calleeUserId === userId && r.status === "ringing",
  );
}
