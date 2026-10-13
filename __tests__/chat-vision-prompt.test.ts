import { describe, expect, it } from "vitest";
import {
  CHAT_VISION_BREAKDOWN_PROMPT,
  withChatVisionInstruction,
} from "../server/_core/chat-vision-prompt";
import { CHAT_PHOTO_SIGN_IN_MESSAGE, isChatSignInError, plainChatError } from "../lib/chat-photo-send";

describe("chat photo reading", () => {
  it("tells the assistant to break the picture down and say what is missing", () => {
    expect(CHAT_VISION_BREAKDOWN_PROMPT).toMatch(/Breakdown/);
    expect(CHAT_VISION_BREAKDOWN_PROMPT).toMatch(/Looks missing from the thing itself/);
    expect(CHAT_VISION_BREAKDOWN_PROMPT).toMatch(/Not in the photo/);
    expect(CHAT_VISION_BREAKDOWN_PROMPT).toMatch(/Nothing looks missing from what I can see/);
  });

  it("adds that reading only when a file is attached", () => {
    expect(withChatVisionInstruction("You are Small Engine AI.", undefined)).toBe(
      "You are Small Engine AI.",
    );
    const withPhoto = withChatVisionInstruction("You are Small Engine AI.", [
      { mimeType: "image/jpeg" },
    ]);
    expect(withPhoto).toContain("You are Small Engine AI.");
    expect(withPhoto).toContain("Looks missing from the thing itself");
  });

  it("turns a signed-out send into a plain sentence and keeps the code out of the reply", () => {
    expect(isChatSignInError(new Error("Please login (10001)"))).toBe(true);
    const text = plainChatError(new Error("Please login (10001)"), "try again");
    expect(text).toBe(CHAT_PHOTO_SIGN_IN_MESSAGE);
    expect(text).not.toContain("10001");
  });
});
