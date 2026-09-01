import { describe, it, expect } from "vitest";
import { listCreatorsForClient } from "../server/_core/ai-creator-registry";
import { OWNER_OPS_AI_IDS } from "../lib/owner-platform-ops-catalog";
import {
  isOwnerOnlyPlatformAi,
  canChatOwnerOpsAi,
  canChatBusinessSteward,
} from "../server/_core/platform-ops-ai";

describe("Owner ops AI access isolation", () => {
  it("never includes owner ops in public client list", () => {
    const publicList = listCreatorsForClient({ includeOwnerOps: false });
    for (const id of OWNER_OPS_AI_IDS) {
      expect(publicList.some((c) => c.id === id)).toBe(false);
    }
  });

  it("includes owner ops only when explicitly requested (admin console)", () => {
    const fullList = listCreatorsForClient({ includeOwnerOps: true });
    for (const id of OWNER_OPS_AI_IDS) {
      expect(fullList.some((c) => c.id === id)).toBe(true);
      expect(fullList.find((c) => c.id === id)?.ownerOnly).toBe(true);
    }
  });

  it("canChatOwnerOpsAi requires owner or staff chat_ops_ai permission", () => {
    expect(canChatOwnerOpsAi({ isPlatformOwner: true })).toBe(true);
    expect(canChatOwnerOpsAi({ isPlatformOwner: false, canChatOwnerOps: true })).toBe(true);
    expect(canChatOwnerOpsAi({ isPlatformOwner: false, canChatOwnerOps: false })).toBe(false);
    expect(canChatOwnerOpsAi({ isPlatformOwner: false })).toBe(false);
  });

  it("marks all owner ops AIs as owner-only", () => {
    for (const id of OWNER_OPS_AI_IDS) {
      expect(isOwnerOnlyPlatformAi(id)).toBe(true);
    }
  });

  it("keeps Business Steward chat owner-only even when staff can chat other ops AIs", () => {
    expect(canChatBusinessSteward({ isPlatformOwner: true })).toBe(true);
    expect(canChatBusinessSteward({ isPlatformOwner: false })).toBe(false);
    expect(canChatOwnerOpsAi({ isPlatformOwner: false, canChatOwnerOps: true })).toBe(true);
  });
});
