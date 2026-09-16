import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("Uri on signup pictures", () => {
  it("shows Uri on the ID and selfie pages on website and app", () => {
    const idPage = readFileSync("components/signup-id-pictures.tsx", "utf8");
    const selfie = readFileSync("components/signup-selfie-check.tsx", "utf8");
    const sample = readFileSync("components/signup-kyc-cartoon-sample.tsx", "utf8");
    const nativePlayer = readFileSync("components/cartoon-studio-player.tsx", "utf8");
    const webPlayer = readFileSync("components/cartoon-studio-player.web.tsx", "utf8");
    expect(idPage).toContain("SignupKycCartoonSample");
    expect(idPage).not.toContain("Hear Uri walk you through it");
    expect(selfie).toContain("SignupKycCartoonSample");
    expect(selfie).toContain("compact");
    expect(sample).toContain("CartoonStudioPlayer");
    expect(nativePlayer).toContain("CartoonStudioPlayerShell");
    expect(webPlayer).toContain("CartoonStudioPlayerShell");
  });
});
