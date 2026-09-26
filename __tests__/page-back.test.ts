import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { goBackOrHome, PAGE_BACK_FALLBACK } from "../lib/page-back";

describe("page back", () => {
  it("goes to the previous page, or Home if there is no history", () => {
    expect(PAGE_BACK_FALLBACK).toBe("/home");
    const back = vi.fn();
    const replace = vi.fn();
    goBackOrHome({ canGoBack: () => true, back, replace });
    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();

    back.mockClear();
    goBackOrHome({ canGoBack: () => false, back, replace });
    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/home");
  });

  it("puts Back on shared headers so website and app match", () => {
    const header = readFileSync("components/tab-screen-header.tsx", "utf8");
    const button = readFileSync("components/page-back-button.tsx", "utf8");
    const home = readFileSync("app/(tabs)/index.tsx", "utf8");
    const login = readFileSync("app/(auth)/login.tsx", "utf8");
    expect(header).toContain("goBackOrHome");
    expect(header).toContain('testID="page-back"');
    expect(button).toContain("goBackOrHome");
    expect(home).toContain("showBack={false}");
    expect(login).toContain("login-back-home");
    expect(readFileSync("components/create-desk-screen.tsx", "utf8")).toContain("TabScreenHeader");
  });

  it("gives every leave-able screen a Back control", () => {
    const files = [
      "app/(tabs)/ais.tsx",
      "app/(tabs)/create.tsx",
      "app/(tabs)/discover.tsx",
      "app/(tabs)/profile.tsx",
      "app/(tabs)/messages.tsx",
      "app/owner-ops.tsx",
      "app/owner-ai/[creatorId]/chat.tsx",
      "app/e-manual.tsx",
      "app/download.tsx",
      "app/world.tsx",
      "app/music-studio.tsx",
      "app/cartoon-studio.tsx",
      "app/playroom.tsx",
      "app/3d-workspace.tsx",
      "app/shop.tsx",
      "app/jobsite.tsx",
      "app/create/video.tsx",
      "app/create/image.tsx",
      "app/create/text.tsx",
      "app/create/templates.tsx",
      "app/create/calendar.tsx",
      "app/create/drafts.tsx",
      "app/ai/[creatorId]/chat.tsx",
      "app/ai/[creatorId]/index.tsx",
      "app/live-session/[sessionId].tsx",
      "app/class-replay/[replayId].tsx",
      "components/public-legal-screen.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(
        src.includes("TabScreenHeader") ||
          src.includes("PageBackButton") ||
          src.includes("goBackOrHome") ||
          src.includes("CreateDeskScreen"),
        file,
      ).toBe(true);
    }
  });
});
