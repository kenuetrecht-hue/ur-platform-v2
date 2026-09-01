import { describe, expect, it } from "vitest";
import {
  isSpeechPromptMimeType,
  normalizeSpeechMime,
  pickPrintedSpeechText,
  SPEECH_PROMPT_MAX_BYTES,
} from "../lib/speech-prompt";
import {
  parseSpeechPromptModelReply,
  transcribeVoicePrompt,
} from "../server/_core/speech-to-prompt-service";

describe("speech prompt helpers", () => {
  it("accepts common browser recording types", () => {
    expect(isSpeechPromptMimeType("audio/webm;codecs=opus")).toBe(true);
    expect(isSpeechPromptMimeType("audio/webm")).toBe(true);
    expect(isSpeechPromptMimeType("audio/mp4")).toBe(true);
    expect(isSpeechPromptMimeType("video/mp4")).toBe(false);
    expect(normalizeSpeechMime("audio/x-wav")).toBe("audio/wav");
  });

  it("prints English when the speech was translated", () => {
    expect(
      pickPrintedSpeechText({
        transcript: "Escribe una canción",
        english: "Write a song",
        translated: true,
      }),
    ).toBe("Write a song");
    expect(
      pickPrintedSpeechText({
        transcript: "Have Songwriter write a UR anthem",
        english: "Have Songwriter write a UR anthem",
        translated: false,
      }),
    ).toBe("Have Songwriter write a UR anthem");
  });

  it("parses Gemini JSON and flags a translation", () => {
    const result = parseSpeechPromptModelReply(
      '```json\n{"transcript":"Haz que Songwriter escriba un himno","language":"Spanish","english":"Have Songwriter write an anthem"}\n```',
    );
    expect(result.language).toBe("Spanish");
    expect(result.translated).toBe(true);
    expect(result.printedText).toBe("Have Songwriter write an anthem");
  });

  it("rejects a disallowed audio type before calling Gemini", async () => {
    await expect(
      transcribeVoicePrompt({
        audioBase64: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        mimeType: "video/mp4",
        isPlatformOwner: true,
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/not allowed/i) });
  });

  it("rejects oversized audio", async () => {
    const oversized = "A".repeat(Math.ceil((SPEECH_PROMPT_MAX_BYTES * 4) / 3) + 80);
    await expect(
      transcribeVoicePrompt({
        audioBase64: oversized,
        mimeType: "audio/webm",
        isPlatformOwner: true,
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/30 seconds/i) });
  });
});
