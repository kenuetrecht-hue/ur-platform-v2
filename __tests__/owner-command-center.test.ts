import { describe, expect, it, beforeEach } from "vitest";
import {
  getOwnerCommandCenterSnapshot,
  listOwnerCommandEvents,
  looksNonEnglish,
  recordAiChatForOwnerCommandCenter,
  recordOwnerCommandEvent,
  toEnglishForOwner,
  _resetOwnerCommandCenterForTests,
} from "../server/_core/owner-command-center-service";

describe("Owner Command Center", () => {
  beforeEach(() => {
    _resetOwnerCommandCenterForTests();
  });

  it("leaves English text untranslated", async () => {
    const result = await toEnglishForOwner("Doctor AI found no issues on the website.");
    expect(result.translated).toBe(false);
    expect(result.english).toContain("Doctor AI");
  });

  it("detects non-Latin scripts that need English", () => {
    expect(looksNonEnglish("平台健康检查完成")).toBe(true);
    expect(looksNonEnglish("فحص الأمان")).toBe(true);
    expect(looksNonEnglish("Health check finished")).toBe(false);
  });

  it("records hive huddles with peer names in English", async () => {
    await recordAiChatForOwnerCommandCenter({
      creatorId: "platform-security-ai",
      userId: "owner-user-123456",
      userMessage: "Are we safe?",
      aiReply: "Yes. I checked with Doctor AI.",
      hivePeers: [
        { id: "platform-doctor-ai", name: "Doctor AI", insight: "Uptime looks healthy." },
        { id: "ai-coder-001", name: "TechBuilder", insight: "No deploy errors in the last hour." },
      ],
    });

    const events = listOwnerCommandEvents({ kind: "hive_consult" });
    expect(events).toHaveLength(1);
    expect(events[0]?.relatedAiNames).toEqual(expect.arrayContaining(["Doctor AI", "TechBuilder"]));
    expect(events[0]?.english).toMatch(/Doctor AI|TechBuilder|Security AI/);
    expect(events[0]?.terminalLine).toMatch(/HIVE CONSULT/i);
  });

  it("still records regular specialist chats for the owner audit", async () => {
    await recordAiChatForOwnerCommandCenter({
      creatorId: "ai-coder-001",
      userId: "member-99",
      userMessage: "How do I add a button?",
      aiReply: "Use a Pressable and keep the handler on the server.",
    });

    const events = listOwnerCommandEvents({ kind: "specialist_chat" });
    expect(events).toHaveLength(1);
    expect(events[0]?.sourceAiName).toBe("TechBuilder");
    expect(events[0]?.english).toMatch(/button/i);
  });

  it("keeps the snapshot owner-only and English-only", () => {
    recordOwnerCommandEvent({
      kind: "incident",
      severity: "high",
      sourceAiId: "platform-security-ai",
      english: "Security AI isolated the shop while a payment error is reviewed.",
      sectionId: "shop",
    });

    const snapshot = getOwnerCommandCenterSnapshot();
    expect(snapshot.ownerOnly).toBe(true);
    expect(snapshot.englishOnly).toBe(true);
    expect(snapshot.roadmap).toHaveLength(4);
    expect(snapshot.roadmap.map((n) => n.name)).toEqual(
      expect.arrayContaining(["Doctor AI", "Administration AI", "Security AI", "Business Steward AI"]),
    );
    expect(snapshot.terminalLines[0]).toMatch(/INCIDENT|Security AI/);
    expect(snapshot.protection.length).toBeGreaterThan(0);
    expect(snapshot.auditNote).toMatch(/English audit/i);
    expect(snapshot.durableSave).toBe(true);
    expect(snapshot.pendingRepairs).toEqual([]);
  });

  it("seeds a private boot line when the feed is empty", () => {
    const snapshot = getOwnerCommandCenterSnapshot();
    expect(snapshot.events[0]?.kind).toBe("protection");
    expect(snapshot.events[0]?.english).toMatch(/Staff and members cannot see this feed/);
    expect(snapshot.terminalLines.length).toBeGreaterThan(0);
  });
});
