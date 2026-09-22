import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("AI texting clicks", () => {
  it("lets people tap specialists and Send on the website", () => {
    const picker = readFileSync("components/ai-specialist-picker.tsx", "utf8");
    const hub = readFileSync("components/ai-hub-tab-row.tsx", "utf8");
    const ais = readFileSync("app/(tabs)/ais.tsx", "utf8");
    const chat = readFileSync("components/creator-ai-interface.tsx", "utf8");
    const composer = readFileSync("components/chat-composer-input.tsx", "utf8");

    expect(picker).toContain("AppPressable");
    expect(picker).toContain('pointerEvents="none"');
    expect(hub).toContain("AppPressable");
    expect(ais).toContain("AppPressable");
    expect(ais).toContain('testID="ai-browse-specialists"');
    expect(chat).toContain('testID="ai-chat-send"');
    expect(chat).toContain("AppPressable");
    expect(composer).toContain("onKeyDown");
    expect(composer).toContain("onSubmitEditing");

    const mic = readFileSync("components/voice-prompt-mic-button.tsx", "utf8");
    expect(mic).toContain("AppPressable");
    expect(mic).toContain('testID="ai-talk-mic"');
    expect(mic).toContain('pointerEvents="none"');
    expect(chat).toContain('testID="ai-talk-hear"');
    expect(chat).toContain('testID="ai-talk-stop"');
  });
});
