import { describe, expect, it } from "vitest";
import { sanitizeChatAttachments } from "../server/_core/chat-attachment-service";

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

  it("strips data URL prefix", () => {
    const result = sanitizeChatAttachments([
      { mimeType: "image/png", base64: "data:image/png;base64,YWJjZGVm" },
    ]);
    expect(result[0]?.base64).toBe("YWJjZGVm");
  });
});
