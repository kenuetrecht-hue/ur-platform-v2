import { TRPCError } from "@trpc/server";

const MAX_SDP_CHARS = 50_000;
const MAX_CANDIDATE_CHARS = 2_000;

function reject(): never {
  throw new TRPCError({ code: "BAD_REQUEST", message: "Call setup was rejected." });
}

/**
 * Store only a browser session description that uses DTLS-SRTP.
 * Unencrypted RTP is refused.
 */
export function assertSecureSessionDescription(raw: string, expectedType: "offer" | "answer"): string {
  let parsed: { type?: unknown; sdp?: unknown };
  try {
    parsed = JSON.parse(raw) as { type?: unknown; sdp?: unknown };
  } catch {
    reject();
  }
  if (parsed.type !== expectedType || typeof parsed.sdp !== "string") reject();
  const sdp = parsed.sdp;
  const starts = sdp.startsWith("v=0\r\n") || sdp.startsWith("v=0\n");
  if (sdp.length < 20 || sdp.length > MAX_SDP_CHARS || !starts) {
    reject();
  }
  if (!sdp.includes("a=fingerprint:")) reject();
  if (!sdp.includes("UDP/TLS/RTP/SAVPF")) reject();
  return JSON.stringify({ type: expectedType, sdp });
}

/** Store only an ICE candidate line from a participant. */
export function assertIceCandidate(raw: string): string {
  let parsed: { candidate?: unknown; sdpMid?: unknown; sdpMLineIndex?: unknown };
  try {
    parsed = JSON.parse(raw) as { candidate?: unknown; sdpMid?: unknown; sdpMLineIndex?: unknown };
  } catch {
    reject();
  }
  if (typeof parsed.candidate !== "string" || parsed.candidate.length > MAX_CANDIDATE_CHARS) reject();
  if (parsed.candidate && !parsed.candidate.startsWith("candidate:")) reject();
  const sdpMid = typeof parsed.sdpMid === "string" ? parsed.sdpMid.slice(0, 32) : null;
  const sdpMLineIndex =
    typeof parsed.sdpMLineIndex === "number" && Number.isInteger(parsed.sdpMLineIndex) && parsed.sdpMLineIndex >= 0
      ? parsed.sdpMLineIndex
      : null;
  return JSON.stringify({ candidate: parsed.candidate, sdpMid, sdpMLineIndex });
}
