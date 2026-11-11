import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { FEED_VIDEO_MAX_BYTES, feedVideoFits, feedVideoKeepSeconds } from "../lib/feed-video-size";
import { isMemberFeedMediaUrl } from "../lib/member-feed-media-url";
import { sniffSocialUpload } from "../server/_core/owner-social-upload-route";

describe("member video posts", () => {
  it("lets a puppy video over 40 MB through and only shortens a very long clip", () => {
    expect(FEED_VIDEO_MAX_BYTES).toBeGreaterThan(40 * 1024 * 1024);
    expect(feedVideoFits(45 * 1024 * 1024)).toBe(true);
    expect(feedVideoFits(FEED_VIDEO_MAX_BYTES + 1)).toBe(false);
    expect(feedVideoKeepSeconds(30)).toBe(30);
    expect(feedVideoKeepSeconds(60 * 60 * 5)).toBeLessThan(60 * 60 * 5);
  });

  it("accepts an mp4 whose ftyp box is not the first box", () => {
    const bytes = Buffer.concat([
      Buffer.from([0, 0, 0, 8]),
      Buffer.from("free"),
      Buffer.from([0, 0, 0, 16]),
      Buffer.from("ftyp"),
      Buffer.from("isom"),
      Buffer.from("junk"),
    ]);
    expect(sniffSocialUpload(bytes)).toMatchObject({ kind: "video", extension: "mp4" });
  });

  it("accepts a quicktime movie and still rejects a random file", () => {
    const mov = Buffer.alloc(16);
    mov.write("ftyp", 4);
    mov.write("qt  ", 8);
    expect(sniffSocialUpload(mov)?.extension).toBe("mov");
    expect(sniffSocialUpload(Buffer.from("not a video"))).toBeNull();
  });

  it("only treats UR-stored media as a message attachment", () => {
    expect(isMemberFeedMediaUrl("https://urplatform.llc/api/member-feed-media/0123456789abcdef0123456789abcdef")).toBe(true);
    expect(isMemberFeedMediaUrl("https://evil.example/api/member-feed-media/0123456789abcdef0123456789abcdef")).toBe(false);
    expect(isMemberFeedMediaUrl("https://urplatform.llc/watch")).toBe(false);
    expect(isMemberFeedMediaUrl("javascript:alert(1)")).toBe(false);
  });

  it("shows a chosen or recorded video in the post box before it is sent", () => {
    const panel = readFileSync("components/social-feed-panel.tsx", "utf8");
    expect(panel).toContain("Record with this camera");
    expect(panel).toContain("Choose a picture or video");
    expect(panel).toContain("Add a statement if you want");
    expect(panel).toContain("mediaPreview");
    expect(panel).not.toContain("over 40 MB");
  });
});
