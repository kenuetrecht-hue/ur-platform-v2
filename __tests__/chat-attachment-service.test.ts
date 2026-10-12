import { describe, expect, it } from "vitest";
import { getHiveCapabilities } from "../server/_core/ai-hive-capabilities";
import { sanitizeChatAttachments } from "../server/_core/chat-attachment-service";
import { normalizeChatAttachmentMime, sniffChatAttachmentMime } from "../lib/chat-attachment-mime";

describe("sanitizeChatAttachments", () => {
  it("accepts valid JPEG base64", () => {
    const tiny = Buffer.from("hello").toString("base64");
    const result = sanitizeChatAttachments([
      { mimeType: "image/jpeg", base64: tiny, fileName: "photo.jpg" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.mimeType).toBe("image/jpeg");
  });

  it("rejects unsupported mime types", () => {
    expect(() =>
      sanitizeChatAttachments([{ mimeType: "application/zip", base64: "YWJj" }]),
    ).toThrow(/Unsupported attachment/);
  });

  it("accepts a camera photo saved as image/jpg and a text file", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64");
    const photo = sanitizeChatAttachments([
      { mimeType: "image/jpg", base64: jpeg, fileName: "engine.jpg" },
    ]);
    expect(photo[0]?.mimeType).toBe("image/jpeg");

    const note = sanitizeChatAttachments([
      { mimeType: "text/csv", base64: Buffer.from("a,b").toString("base64"), fileName: "notes.csv" },
    ]);
    expect(note[0]?.mimeType).toBe("text/plain");
  });

  it("reads a JPEG when the phone leaves the file type blank", () => {
    expect(sniffChatAttachmentMime("/9j/4AAQ")).toBe("image/jpeg");
    expect(normalizeChatAttachmentMime("application/octet-stream", "manual.pdf")).toBe("application/pdf");
    expect(normalizeChatAttachmentMime("", "photo.HEIC")).toBeNull();
  });

  it("lets every assistant read photos and documents", () => {
    for (const id of [
      "ai-small-engine-001",
      "contentmate",
      "linguamate",
      "ai-translator-001",
      "ai-crypto-001",
      "ai-news-001",
      "platform-administration-ai",
    ]) {
      expect(getHiveCapabilities(id).photoAnalysis).toBe(true);
    }
  });

  it("strips data URL prefix", () => {
    const result = sanitizeChatAttachments([
      { mimeType: "image/png", base64: "data:image/png;base64,YWJjZGVm" },
    ]);
    expect(result[0]?.base64).toBe("YWJjZGVm");
  });
});
