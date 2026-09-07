import { describe, expect, it } from "vitest";
import {
  mapElevenLabsVoiceError,
  resolveCreatorVoicePersona,
} from "../server/elevenlabs-integration";

describe("resolveCreatorVoicePersona", () => {
  it("maps known desks and falls back so every specialist can speak", () => {
    expect(resolveCreatorVoicePersona("platform-business-steward-ai")).toBe("STEWARD");
    expect(resolveCreatorVoicePersona("linguamate")).toBe("LINGUA");
    expect(resolveCreatorVoicePersona("ai-coder-001")).toBe("TECH_BUILDER");
    expect(resolveCreatorVoicePersona("ai-electrician-001")).toBe("PLUMBING_FOREMAN");
    expect(resolveCreatorVoicePersona("ai-attorney-tax-001")).toBe("COMPLIANCE_DOCTOR");
    expect(resolveCreatorVoicePersona("ai-culinary-001")).toBe("URI_HOST");
  });
});

describe("mapElevenLabsVoiceError", () => {
  it("maps quota and auth failures to device-voice fallback copy", () => {
    expect(mapElevenLabsVoiceError(401, "Unauthorized")).toMatch(/key was rejected/i);
    expect(mapElevenLabsVoiceError(402, "quota_exceeded")).toMatch(/quota is used up/i);
    expect(mapElevenLabsVoiceError(200, "character_limit exceeded")).toMatch(/quota is used up/i);
  });
});
