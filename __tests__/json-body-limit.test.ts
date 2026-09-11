import { describe, expect, it } from "vitest";
import {
  AGE_KYC_JSON_BODY_LIMIT,
  DEFAULT_JSON_BODY_LIMIT,
  isPayloadTooLargeError,
  jsonBodyLimitForPath,
} from "../server/_core/json-body-limit";

describe("json body limit", () => {
  it("keeps the 1mb cap except for the ID photo check", () => {
    expect(jsonBodyLimitForPath("/api/trpc/auth.login")).toBe(DEFAULT_JSON_BODY_LIMIT);
    expect(jsonBodyLimitForPath("/api/trpc/ageKyc.precheck")).toBe(AGE_KYC_JSON_BODY_LIMIT);
    expect(jsonBodyLimitForPath("/api/trpc/ageKyc.precheck?batch=1")).toBe(AGE_KYC_JSON_BODY_LIMIT);
    expect(jsonBodyLimitForPath("/api/trpc/agekyc.submit")).toBe(AGE_KYC_JSON_BODY_LIMIT);
  });

  it("recognizes Express payload-too-large errors", () => {
    expect(isPayloadTooLargeError({ status: 413, type: "entity.too.large" })).toBe(true);
    expect(isPayloadTooLargeError({ status: 400 })).toBe(false);
  });
});
