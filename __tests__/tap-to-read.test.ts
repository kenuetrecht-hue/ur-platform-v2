import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("tap-to-read disclosures", () => {
  it("keeps long join legal text behind a tap, not on the checkbox", () => {
    const join = readFileSync("components/finish-account-after-id-pass.tsx", "utf8");
    expect(join).toContain("TapToRead");
    expect(join).toContain("I am 18 or older and I agree");
    expect(join).toContain("Show password");
    expect(join).toContain("signing you in");
    expect(join.indexOf("1. Name, email, and password")).toBeLessThan(
      join.indexOf("2. Then take the three pictures"),
    );
  });
});
