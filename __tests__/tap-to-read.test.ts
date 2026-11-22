import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("tap-to-read disclosures", () => {
  it("keeps long join legal text behind a tap, not on the checkbox", () => {
    const join = readFileSync("components/finish-account-after-id-pass.tsx", "utf8");
    expect(join).toContain("AgreeAndReadRow");
    expect(join).toContain('href="/terms"');
    expect(join).not.toContain("OK — I agree to the Terms");
    expect(join).toContain("Verify your password");
    expect(join).toContain('testID="verify-password"');
    expect(join).toContain("Submit");
    expect(join).toContain("I agree to the Terms of Use, rules, and regulations.");
    expect(join).toContain("AGE_OVER_18_CHECKBOX_LABEL");
    expect(join).toContain('testID="confirm-over-18"');
    expect(readFileSync("lib/platform-terms-of-use.ts", "utf8")).toContain(
      "I am over the age of eighteen. If I lie about my age, UR Platform is not responsible.",
    );
    expect(join).not.toContain("Continue to ID pictures");
    expect(join).not.toContain("AgeKycPhotoCapture");
    expect(join).not.toContain("IdCheckDuringSignin");
  });
});
