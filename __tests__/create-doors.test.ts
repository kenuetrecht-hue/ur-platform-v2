import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  CREATE_DESK_ROUTES,
  CREATE_TEMPLATES,
  formatDeskDate,
  templateById,
  upsertDraft,
  weekDates,
  type CreateDraft,
} from "../lib/create-desk";

describe("create doors", () => {
  it("gives every Make door that was a missing page a real file", () => {
    const navigation = readFileSync("lib/consolidated-navigation.ts", "utf8");
    const createScreen = readFileSync("app/(tabs)/create.tsx", "utf8");
    for (const route of Object.values(CREATE_DESK_ROUTES)) {
      expect(navigation).toContain(`route: "${route}"`);
      const file = `app${route}.tsx`;
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file, "utf8")).toContain("CreateDeskScreen");
    }
    expect(createScreen).toContain('item.id === "ai"');
    expect(createScreen).toContain("router.push(item.route");
    expect(existsSync("app/cartoon-studio.tsx")).toBe(true);
    expect(existsSync("app/music-studio.tsx")).toBe(true);
  });

  it("opens each template on the page that does that job", () => {
    expect(templateById("short-video")?.route).toBe("/create/video");
    expect(templateById("class-promo")?.route).toBe("/create/text");
    expect(templateById("square-image")?.route).toBe("/create/image");
    expect(templateById("week-plan")?.route).toBe("/create/calendar");
    expect(templateById("cartoon")?.route).toBe("/cartoon-studio");
    expect(templateById("music")?.route).toBe("/music-studio");
    expect(CREATE_TEMPLATES).toHaveLength(6);
  });

  it("builds seven calendar days and keeps the newest draft first", () => {
    const days = weekDates(new Date(2026, 8, 26));
    expect(days).toEqual([
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(formatDeskDate(new Date(2026, 0, 5))).toBe("2026-01-05");

    const older: CreateDraft = {
      id: "a",
      kind: "text",
      title: "Old",
      body: "First",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const newer: CreateDraft = { ...older, id: "a", title: "New", updatedAt: "2026-09-26T00:00:00.000Z" };
    const saved = upsertDraft([older, { ...older, id: "b", title: "Other" }], newer);
    expect(saved.map((draft) => draft.id)).toEqual(["a", "b"]);
    expect(saved[0]?.title).toBe("New");
  });
});
