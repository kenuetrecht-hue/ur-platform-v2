/**
 * Friend video call rooms — in-memory signaling MVP.
 * Web clients use WebRTC; native shows join status + falls back to web link.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { listFriends } from "./social-service";

export type VideoCallStatus = "ringing" | "active" | "ended";

export type VideoCallRoom = {
  id: string;
  callerUserId: string;
  calleeUserId: string;
  status: VideoCallStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  /** Simple signaling payloads for WebRTC offer/answer/ICE */
  offerSdp?: string;
  answerSdp?: string;
  iceCandidates: Array<{ fromUserId: string; candidate: string }>;
};

const rooms = new Map<string, VideoCallRoom>();

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

export function createVideoCall(params: {
  callerUserId: string;
  calleeUserId: string;
}): VideoCallRoom {
  if (params.callerUserId === params.calleeUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot call yourself." });
  }
  assertFriends(params.callerUserId, params.calleeUserId);

  const room: VideoCallRoom = {
    id: randomUUID(),
    callerUserId: params.callerUserId,
    calleeUserId: params.calleeUserId,
    status: "ringing",
    createdAt: new Date().toISOString(),
    iceCandidates: [],
  };
  rooms.set(room.id, room);
  return room;
}

export function getVideoCallRoom(roomId: string): VideoCallRoom | null {
  return rooms.get(roomId) ?? null;
}

export function joinVideoCall(params: {
  roomId: string;
  userId: string;
}): VideoCallRoom {
  const room = rooms.get(params.roomId);
  if (!room) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Video call not found." });
  }
  const allowed =
    params.userId === room.callerUserId || params.userId === room.calleeUserId;
  if (!allowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant in this call." });
  }
  if (room.status === "ended") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This call has ended." });
  }
  room.status = "active";
  room.startedAt = room.startedAt ?? new Date().toISOString();
  rooms.set(room.id, room);
  return room;
}

export function endVideoCall(params: { roomId: string; userId: string }): VideoCallRoom {
  const room = rooms.get(params.roomId);
  if (!room) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Video call not found." });
  }
  const allowed =
    params.userId === room.callerUserId || params.userId === room.calleeUserId;
  if (!allowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant in this call." });
  }
  room.status = "ended";
  room.endedAt = new Date().toISOString();
  rooms.set(room.id, room);
  return room;
}

export function setVideoOffer(roomId: string, userId: string, sdp: string): VideoCallRoom {
  const room = rooms.get(roomId);
  if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Video call not found." });
  if (userId !== room.callerUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the caller sends the offer." });
  }
  room.offerSdp = sdp.slice(0, 50000);
  rooms.set(roomId, room);
  return room;
}

export function setVideoAnswer(roomId: string, userId: string, sdp: string): VideoCallRoom {
  const room = rooms.get(roomId);
  if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Video call not found." });
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
  const room = rooms.get(params.roomId);
  if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Video call not found." });
  room.iceCandidates.push({
    fromUserId: params.userId,
    candidate: params.candidate.slice(0, 8000),
  });
  if (room.iceCandidates.length > 50) {
    room.iceCandidates = room.iceCandidates.slice(-50);
  }
  rooms.set(params.roomId, room);
  return room;
}

export function listIncomingCalls(userId: string): VideoCallRoom[] {
  return [...rooms.values()].filter(
    (r) => r.calleeUserId === userId && r.status === "ringing",
  );
}
