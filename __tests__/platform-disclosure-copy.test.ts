import { describe, it, expect } from "vitest";
import {
  buildAiChatDisclosure,
  LEGAL_AI_DISCLAIMER,
  PLATFORM_DISCLOSURE_BOTTOM,
  PLATFORM_DISCLOSURE_FULL,
  AI_WELCOME_DISCLOSURE_SUFFIX,
} from "../lib/platform-disclosure-copy";
import { AI_IDENTITY_DISCLOSURE_PROMPT, AI_BOUNDARY_PROMPT } from "../server/_core/multilingual-prompts";

describe("platform disclosure copy", () => {
  it("chat disclosure states AI identity, education-only, and affiliate commission", () => {
    const text = buildAiChatDisclosure("Tax Attorney AI");
    expect(text).toMatch(/Tax Attorney AI/i);
    expect(text).toMatch(/AI assistant, not a human/i);
    expect(text).toMatch(/entertainment and educational/i);
    expect(text).toMatch(/professional advice/i);
    expect(text).toMatch(/commission/i);
  });

  it("legal AI disclaimer covers licensed professional referral", () => {
    expect(LEGAL_AI_DISCLAIMER).toMatch(/not a licensed attorney/i);
    expect(LEGAL_AI_DISCLAIMER).toMatch(/entertainment and educational/i);
    expect(LEGAL_AI_DISCLAIMER).toMatch(/commission/i);
  });

  it("global footer and welcome suffix reinforce AI identity", () => {
    expect(PLATFORM_DISCLOSURE_BOTTOM).toMatch(/AI, not humans/i);
    expect(PLATFORM_DISCLOSURE_FULL).toMatch(/not real people or licensed professionals/i);
    expect(AI_WELCOME_DISCLOSURE_SUFFIX).toMatch(/not a licensed professional/i);
  });

  it("system prompts require AI identity disclosure", () => {
    expect(AI_IDENTITY_DISCLOSURE_PROMPT).toMatch(/not a human or licensed professional/i);
    expect(AI_BOUNDARY_PROMPT).toMatch(/entertainment and educational purposes only/i);
    expect(AI_BOUNDARY_PROMPT).toMatch(/website or phone app/i);
    expect(AI_BOUNDARY_PROMPT).toMatch(/18\+ ID check/i);
  });
});
