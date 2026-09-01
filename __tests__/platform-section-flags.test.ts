import { describe, it, expect, beforeEach } from "vitest";
import {
  disablePlatformSection,
  enablePlatformSection,
  isPlatformSectionEnabled,
  listPlatformSectionStates,
  _resetPlatformSectionsForTests,
} from "../server/_core/platform-section-flags-service";
import { inferSectionFromOpsText } from "../lib/platform-section-flags";

describe("platform-section-flags", () => {
  beforeEach(() => _resetPlatformSectionsForTests());

  it("starts with all sections enabled", () => {
    const sections = listPlatformSectionStates();
    expect(sections.length).toBeGreaterThan(5);
    expect(sections.every((s) => s.enabled)).toBe(true);
  });

  it("disables one section without affecting others", () => {
    disablePlatformSection({
      sectionId: "3d_workspace",
      reason: "Babylon crash",
      disabledBy: "platform-doctor-ai",
    });
    expect(isPlatformSectionEnabled("3d_workspace", false)).toBe(false);
    expect(isPlatformSectionEnabled("ai_chat", false)).toBe(true);
    expect(isPlatformSectionEnabled("3d_workspace", true)).toBe(true);
  });

  it("re-enables a section", () => {
    disablePlatformSection({
      sectionId: "blueprint_reader",
      reason: "Upload bug",
      disabledBy: "owner",
    });
    enablePlatformSection({ sectionId: "blueprint_reader", ownerNote: "Fix verified" });
    expect(isPlatformSectionEnabled("blueprint_reader", false)).toBe(true);
  });

  it("infers section ids from ops chat text", () => {
    expect(inferSectionFromOpsText("isolate the 3d workspace due to bug")).toBe("3d_workspace");
    expect(inferSectionFromOpsText("hive town hall errors")).toBe("hive_town_hall");
    expect(inferSectionFromOpsText("clock in failed on the job site")).toBe("jobsite");
    expect(inferSectionFromOpsText("UR World plaza is down")).toBe("ur_world");
  });
});
