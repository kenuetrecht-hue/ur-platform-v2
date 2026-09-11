import type { AgeKycMimeType } from "../../lib/age-kyc-policy";

/** Trust file bytes, not the client Content-Type header. */
export function sniffAgeKycImageMime(bytes: Uint8Array): AgeKycMimeType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...Array.from(bytes.subarray(start, end)));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}
