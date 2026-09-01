import { afterEach, describe, expect, it } from "vitest";
import {
  detectStewardWorkTargets,
  isStewardCommissionRequest,
  publicStewardCommission,
  runStewardCommission,
  _resetStewardCommissionsForTests,
  _setStewardCommissionGeneratorForTests,
} from "../server/_core/steward-commission-service";

describe("Steward commissions other AIs", () => {
  afterEach(() => {
    _resetStewardCommissionsForTests();
  });

  it("routes songs, ebooks, audiobooks, and video scripts to the right specialists", () => {
    expect(detectStewardWorkTargets("Have the songwriter write songs for UR")).toEqual([
      { kind: "song", specialistId: "ai-songwriter-001" },
    ]);
    expect(detectStewardWorkTargets("Ask the ebook writer for an educational book")).toEqual([
      { kind: "ebook", specialistId: "ai-author-001" },
    ]);
    expect(detectStewardWorkTargets("Produce an audiobook narration")).toEqual([
      { kind: "audiobook_script", specialistId: "ai-author-001" },
    ]);
    expect(detectStewardWorkTargets("Put on educational videos for the platform")).toEqual([
      { kind: "video_script", specialistId: "ai-content-helper-001" },
    ]);
    expect(isStewardCommissionRequest("How is the weather?")).toBe(false);
  });

  it("lets the owner commission a specialist and saves the draft", async () => {
    _setStewardCommissionGeneratorForTests(async () => ({
      reply: "TITLE: UR Rise\nVerse 1: We build the hive...",
      model: "test",
    }));
    const jobs = await runStewardCommission({
      brief: "Have Songwriter AI write a UR Platform anthem",
      ownerUserId: "owner-1",
      isPlatformOwner: true,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.specialistId).toBe("ai-songwriter-001");
    expect(jobs[0]?.title).toBe("UR Rise");
    expect(jobs[0]?.status).toBe("ready");
    expect(publicStewardCommission(jobs[0]!).body).toContain("We build the hive");
  });

  it("blocks anyone who is not the platform owner", async () => {
    await expect(
      runStewardCommission({
        brief: "Have the songwriter write songs",
        ownerUserId: "member-1",
        isPlatformOwner: false,
      }),
    ).rejects.toThrow(/platform owner/);
  });
});
