import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  OWNER_OPS_TABS,
  OWNER_OPS_TAB_ROWS,
  isOwnerOpsTabId,
  ownerOpsConsoleDesk,
  showOwnerOpsDesk,
} from "../lib/owner-ops-tabs";

describe("owner ops tabs", () => {
  it("puts each admin desk on its own tap tab", () => {
    expect(OWNER_OPS_TABS.map((tab) => tab.id)).toEqual([
      "chat",
      "prices",
      "posts",
      "staff",
      "sections",
      "program",
      "people",
      "command",
      "conduct",
      "money",
      "security",
      "more",
    ]);
    expect(OWNER_OPS_TAB_ROWS).toHaveLength(2);
    expect(OWNER_OPS_TAB_ROWS[0].map((tab) => tab.id)).toEqual([
      "chat",
      "prices",
      "posts",
      "staff",
      "sections",
      "program",
    ]);
    expect(isOwnerOpsTabId("chat")).toBe(true);
    expect(isOwnerOpsTabId("ais")).toBe(false);
    expect(ownerOpsConsoleDesk("chat")).toBe("chat");
    expect(ownerOpsConsoleDesk("prices")).toBe("prices");
    expect(ownerOpsConsoleDesk("posts")).toBe("posts");
    expect(ownerOpsConsoleDesk("staff")).toBe("staff");
    expect(ownerOpsConsoleDesk("sections")).toBe("sections");
    expect(ownerOpsConsoleDesk("program")).toBe("program");
    expect(ownerOpsConsoleDesk("money")).toBe("ledger");
    expect(ownerOpsConsoleDesk("people")).toBeNull();
    expect(showOwnerOpsDesk("prices", "prices")).toBe(true);
    expect(showOwnerOpsDesk("prices", "chat")).toBe(false);
    expect(showOwnerOpsDesk("all", "chat")).toBe(true);
  });

  it("opens Administration on Chat and uses Social-style hub tabs", () => {
    const ops = readFileSync("app/owner-ops.tsx", "utf8");
    const consoleSource = readFileSync("components/platform-ops-console.tsx", "utf8");
    expect(ops).toContain("HubTabBar");
    expect(ops).toContain("OWNER_OPS_TAB_ROWS");
    expect(ops).toContain('useState<OwnerOpsTabId>("chat")');
    expect(ops).toContain("OwnerMemberCensusPanel");
    expect(ops).toContain("OwnerComplimentaryTextAccessPanel");
    expect(ops).toContain("OwnerSigninResetPanel");
    expect(ops).toContain('desk={consoleDesk}');
    expect(consoleSource).toContain('desk = "all"');
    expect(consoleSource).toContain("showOwnerOpsDesk");
    expect(consoleSource).toContain("chatDesk");
    expect(consoleSource).toContain('pathname: "/owner-ai/[creatorId]/chat"');
    expect(consoleSource).toContain('testID="owner-ops-open-chat"');
    expect(consoleSource).toContain("OwnerComplimentaryTextAccessPanel");
    const grant = readFileSync("components/owner-complimentary-text-access-panel.tsx", "utf8");
    expect(grant).toContain('features: ["ai_chat"]');
    expect(grant).toContain("Give free texting");
    expect(grant).toContain("Email for free texting");
  });
});
