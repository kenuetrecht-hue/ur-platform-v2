import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { CALL_VIDEO_MAX_BITRATE } from "../lib/call-media-profile";
import { assertIceCandidate, assertSecureSessionDescription } from "../server/_core/call-media-guard";

const SECURE_SDP = [
  "v=0",
  "o=- 1 1 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "m=audio 9 UDP/TLS/RTP/SAVPF 111",
  "a=fingerprint:sha-256 AA:BB",
  "a=setup:actpass",
].join("\r\n");

describe("call media is encrypted and capped", () => {
  it("accepts a DTLS-SRTP offer and refuses an open one", () => {
    const stored = assertSecureSessionDescription(
      JSON.stringify({ type: "offer", sdp: SECURE_SDP }),
      "offer",
    );
    expect(stored).toContain("UDP/TLS/RTP/SAVPF");
    expect(stored).toContain("a=fingerprint:");

    const openSdp = SECURE_SDP.replace("UDP/TLS/RTP/SAVPF", "RTP/AVP").replace("a=fingerprint:sha-256 AA:BB\r\n", "");
    expect(() => assertSecureSessionDescription(JSON.stringify({ type: "offer", sdp: openSdp }), "offer")).toThrow(
      TRPCError,
    );
    expect(() => assertSecureSessionDescription(JSON.stringify({ type: "answer", sdp: SECURE_SDP }), "offer")).toThrow(
      TRPCError,
    );
  });

  it("keeps only a real ICE candidate", () => {
    const stored = JSON.parse(
      assertIceCandidate(JSON.stringify({ candidate: "candidate:1 1 UDP 1 1.2.3.4 9 typ host", sdpMid: "0", sdpMLineIndex: 0 })),
    ) as { candidate: string };
    expect(stored.candidate.startsWith("candidate:")).toBe(true);
    expect(() => assertIceCandidate(JSON.stringify({ candidate: "http://evil.example/steal" }))).toThrow(TRPCError);
    expect(CALL_VIDEO_MAX_BITRATE).toBeLessThanOrEqual(1_200_000);
  });
});
