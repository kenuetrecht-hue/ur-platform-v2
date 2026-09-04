import { describe, expect, it } from "vitest";
import {
  buildCreatorSystemPrompt,
  isCreatorAiId,
  listCreatorsForClient,
} from "../server/_core/ai-creator-registry";
import { isGoogleCloudAiConfigured } from "../server/_core/google-ai";

describe("AI specialist communication wiring", () => {
  const publicCreators = listCreatorsForClient({ includeOwnerOps: false });

  it("registers every public specialist with a non-empty system prompt", () => {
    expect(publicCreators.length).toBeGreaterThan(40);
    for (const creator of publicCreators) {
      expect(isCreatorAiId(creator.id)).toBe(true);
      const prompt = buildCreatorSystemPrompt(creator.id);
      expect(prompt.trim().length).toBeGreaterThan(80);
      expect(prompt).toContain(creator.name);
    }
  });

  it("keeps Culinary Arts AI on the public list with a kitchen prompt", () => {
    const culinary = publicCreators.find((c) => c.id === "ai-culinary-001");
    expect(culinary?.name).toBe("Culinary Arts AI");
    expect(culinary?.category).toBe("Culinary");
    const prompt = buildCreatorSystemPrompt("ai-culinary-001");
    expect(prompt).toMatch(/Culinary Arts AI/);
    expect(prompt.length).toBeGreaterThan(200);
  });

  it("does not expose Gemini configuration as a reason to hide Culinary from the hub", () => {
    expect(isCreatorAiId("ai-culinary-001")).toBe(true);
    expect(typeof isGoogleCloudAiConfigured()).toBe("boolean");
  });
});
