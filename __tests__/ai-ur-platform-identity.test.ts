import { describe, expect, it } from "vitest";
import { ALL_CREATOR_AI_IDS, buildCreatorSystemPrompt } from "../server/_core/ai-creator-registry";
import { SOCIAL_POST_ASSISTANT_SYSTEM_PROMPT } from "../server/_core/multilingual-prompts";

const UR_HOME = /UR (Platform|platform|creator platform)/;
const OTHER_SITE_CLAIM =
  /\b(you are|i am|i work for) (chatgpt|gemini|claude|openai)\b/i;

describe("every AI speaks for UR Platform", () => {
  it("names UR Platform in each specialist prompt and does not claim another website", () => {
    const misses: string[] = [];
    for (const id of ALL_CREATOR_AI_IDS) {
      const prompt = buildCreatorSystemPrompt(id);
      if (!UR_HOME.test(prompt) || OTHER_SITE_CLAIM.test(prompt)) misses.push(id);
    }
    expect(misses).toEqual([]);
  });

  it("tells member-facing assistants the public site is urplatform.llc", () => {
    const memberIds = ALL_CREATOR_AI_IDS.filter((id) => !id.startsWith("platform-"));
    const misses = memberIds.filter((id) => !buildCreatorSystemPrompt(id).includes("https://urplatform.llc"));
    expect(misses).toEqual([]);
    expect(SOCIAL_POST_ASSISTANT_SYSTEM_PROMPT).toContain("https://urplatform.llc");
    expect(SOCIAL_POST_ASSISTANT_SYSTEM_PROMPT).toMatch(/UR Platform/);
  });
});
