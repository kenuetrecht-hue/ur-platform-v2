import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("tap-to-read disclosures", () => {
  it("keeps long join legal text behind a tap, not on the checkbox", () => {
    const join = readFileSync("components/finish-account-after-id-pass.tsx", "utf8");
    expect(join).toContain("TapToRead");
    expect(join).toContain("I am 18 or older and I agree");
    expect(join).toContain("Show password");
    expect(join).toContain('testID="show-password"');
    expect(join).toContain("Continue to ID pictures");
    expect(join).not.toContain("AgeKycPhotoCapture");
    expect(join).not.toContain("IdCheckDuringSignin");
  });
});
