import { describe, expect, it, beforeEach } from "vitest";
import {
  clampMusicBpm,
  countActiveHits,
  emptyMusicPattern,
  suggestChordProgressions,
  toggleMusicStep,
} from "../lib/music-studio";
import { inferSectionFromOpsText } from "../lib/platform-section-flags";
import {
  createMusicProject,
  getMusicProject,
  joinMusicProject,
  listMusicProjects,
  saveMusicProject,
  _resetMusicStudioForTests,
} from "../server/_core/music-studio-service";
import {
  consumeMusicExport,
  getMusicStudioStatus,
  purchaseMusicStudioPlan,
  _resetMusicStudioEntitlementsForTests,
} from "../server/_core/music-studio-entitlement-service";
import { quoteMusicStudio, MUSIC_STUDIO_PLANS } from "../lib/music-studio-pricing";
import { IN_APP_ONLY_SUBTOTAL_CENTS } from "../lib/payment-channel-policy";
import { RESOURCE_NOT_FOUND } from "../server/_core/input-sanitize";

describe("music studio", () => {
  beforeEach(() => {
    _resetMusicStudioForTests();
    _resetMusicStudioEntitlementsForTests();
  });

  it("toggles a beat step and counts hits", () => {
    const start = emptyMusicPattern();
    const next = toggleMusicStep(start, "kick", 1);
    expect(next.kick[1]).toBe(!start.kick[1]);
    expect(countActiveHits(next)).toBeGreaterThan(0);
  });

  it("clamps BPM and suggests chords in the chosen key", () => {
    expect(clampMusicBpm(10)).toBe(60);
    expect(clampMusicBpm(400)).toBe(180);
    expect(suggestChordProgressions("G")[0]).toMatch(/^G/);
  });

  it("saves an owned project and lets a collaborator join by code", () => {
    const created = createMusicProject({ userId: "owner-1", title: "Porch jam" });
    expect(created.owner).toBe(true);
    expect(created.joinCode).toHaveLength(6);

    const saved = saveMusicProject({
      userId: "owner-1",
      projectId: created.id,
      bpm: 110,
      lyrics: "Meet me on the porch",
    });
    expect(saved.bpm).toBe(110);
    expect(saved.lyrics).toBe("Meet me on the porch");

    const joined = joinMusicProject({ userId: "friend-2", joinCode: created.joinCode });
    expect(joined.owner).toBe(false);
    expect(joined.lyrics).toBe("Meet me on the porch");
    expect(listMusicProjects("friend-2").map((p) => p.id)).toContain(created.id);
    expect(getMusicProject(created.id, "friend-2").title).toBe("Porch jam");
  });

  it("hides projects from strangers", () => {
    const created = createMusicProject({ userId: "owner-1", title: "Private" });
    expect(() => getMusicProject(created.id, "stranger")).toThrow(RESOURCE_NOT_FOUND);
  });

  it("maps ops text to the music studio section", () => {
    expect(inferSectionFromOpsText("make beats in the music studio")).toBe("music_studio");
  });

  it("prices Pro cheap on the web and never at the $5 in-app SKU", () => {
    for (const plan of MUSIC_STUDIO_PLANS) {
      const quote = quoteMusicStudio(plan.id);
      expect(quote.subtotalCents).not.toBe(IN_APP_ONLY_SUBTOTAL_CENTS);
      expect(quote.subtotalCents).toBeGreaterThan(0);
    }
    expect(quoteMusicStudio("session").subtotalCents).toBe(299);
    expect(quoteMusicStudio("month").subtotalCents).toBe(999);
  });

  it("unlocks Pro after purchase and spends an export from that lot", () => {
    expect(getMusicStudioStatus("user-a").hasPro).toBe(false);
    purchaseMusicStudioPlan({ userId: "user-a", planId: "session" });
    expect(getMusicStudioStatus("user-a").hasPro).toBe(true);
    expect(getMusicStudioStatus("user-a").exportsRemaining).toBe(3);
    consumeMusicExport("user-a", false);
    expect(getMusicStudioStatus("user-a").exportsRemaining).toBe(2);
    expect(getMusicStudioStatus("owner", true).complimentary).toBe(true);
  });

  it("saves mixer and extra Pro tracks on a project", () => {
    const created = createMusicProject({ userId: "owner-1", title: "Mix" });
    const mixer = created.mixer;
    mixer.kick.volume = 40;
    mixer.lead.mute = true;
    const saved = saveMusicProject({
      userId: "owner-1",
      projectId: created.id,
      mixer,
      bars: 4,
    });
    expect(saved.mixer.kick.volume).toBe(40);
    expect(saved.mixer.lead.mute).toBe(true);
    expect(saved.bars).toBe(4);
    expect(saved.pattern.lead.length).toBe(32);
  });
});
