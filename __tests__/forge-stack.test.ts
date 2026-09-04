import { describe, it, expect } from "vitest";
import {
  TECH_BUILDER_ID,
  GAME_FORGE_ID,
  CHAIN_SMITH_ID,
  isForgeSpecialist,
  forgeLearnLabel,
} from "../lib/forge-specialists";
import { getHandoffSuggestions, buildHandoffMessage } from "../server/_core/ai-handoff-service";
import { listForgeTemplates } from "../server/_core/forge-templates";
import { listDeployTargets, generateDeployWizard } from "../server/_core/forge-deploy-wizards";
import { buildProjectZip } from "../server/_core/forge-export-service";
import { listHiveAssetPacks, getHiveAssetPack } from "../server/_core/forge-hive-assets";
import { createShareLink, getSharePreview, sweepExpiredShareLinks } from "../server/_core/forge-share-service";
import { buildPatchDiffs, parsePatchesFromAiReply } from "../server/_core/forge-patch-service";
import { buildSandboxPreview } from "../server/_core/forge-preview-service";
import { assessDeployReadiness } from "../server/_core/forge-deploy-readiness";
import { runForgePlaytestChecklist } from "../server/_core/forge-playtest-service";
import { getCreatorAi } from "../server/_core/ai-creator-registry";

const sampleProject = {
  id: "proj-1",
  userId: "user-1",
  name: "Demo App",
  description: "Sample forge project for tests",
  framework: "html",
  files: [
    { path: "index.html", content: "<html><body>Hello</body></html>" },
    { path: "package.json", content: '{"name":"demo","scripts":{"test":"echo ok"}}' },
    { path: "README.md", content: "# Demo\n\nRun locally." },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Forge specialists", () => {
  it("identifies TechBuilder and GameForge", () => {
    expect(isForgeSpecialist(TECH_BUILDER_ID)).toBe(true);
    expect(isForgeSpecialist(GAME_FORGE_ID)).toBe(true);
    expect(isForgeSpecialist(CHAIN_SMITH_ID)).toBe(true);
    expect(isForgeSpecialist("ai-news-001")).toBe(false);
  });

  it("returns correct learn tab labels", () => {
    expect(forgeLearnLabel(TECH_BUILDER_ID)).toBe("Learn to code");
    expect(forgeLearnLabel(GAME_FORGE_ID)).toBe("Learn game dev");
    expect(forgeLearnLabel(CHAIN_SMITH_ID)).toBe("Learn blockchain");
    expect(forgeLearnLabel("ai-news-001")).toBe("Learn the trade");
  });

  it("registers both forge specialists in server registry", () => {
    expect(getCreatorAi(TECH_BUILDER_ID)?.name).toBeTruthy();
    expect(getCreatorAi(GAME_FORGE_ID)?.name).toBeTruthy();
  });
});

describe("Cross-specialist handoffs", () => {
  it("suggests handoffs for TechBuilder and GameForge", () => {
    const coder = getHandoffSuggestions(TECH_BUILDER_ID);
    const game = getHandoffSuggestions(GAME_FORGE_ID);
    expect(coder.length).toBeGreaterThanOrEqual(2);
    expect(game.length).toBeGreaterThanOrEqual(2);
    expect(coder.some((h) => h.targetCreatorId === GAME_FORGE_ID)).toBe(true);
    expect(game.some((h) => h.targetCreatorId === TECH_BUILDER_ID)).toBe(true);
  });

  it("uses expo tab routes for AI handoffs", () => {
    for (const id of [TECH_BUILDER_ID, GAME_FORGE_ID]) {
      for (const h of getHandoffSuggestions(id)) {
        if (!h.route.startsWith("/3d")) {
          expect(h.route).toBe("/(tabs)/ais");
        }
        expect(h.prefillPrompt.length).toBeGreaterThan(10);
        expect(h.targetName.length).toBeGreaterThan(0);
      }
    }
  });

  it("builds handoff context message", () => {
    const msg = buildHandoffMessage(TECH_BUILDER_ID, GAME_FORGE_ID, "Build a score system");
    expect(msg).toContain("Handoff");
    expect(msg).toContain("Build a score system");
  });
});

describe("Forge templates & deploy wizards", () => {
  it("lists coder and game templates separately", () => {
    const coder = listForgeTemplates("coder");
    const game = listForgeTemplates("game");
    expect(coder.length).toBeGreaterThanOrEqual(2);
    expect(game.length).toBeGreaterThanOrEqual(3);
    expect(game.some((t) => t.id === "expo-mobile-game")).toBe(true);
    expect(coder.every((t) => t.id && t.label && t.description)).toBe(true);
  });

  it("lists deploy targets per specialist", () => {
    expect(listDeployTargets("coder")).toContain("vercel");
    expect(listDeployTargets("game")).toContain("itch-io");
    expect(listDeployTargets("game")).toContain("apple-app-store");
    expect(listDeployTargets("game")).toContain("google-play-store");
  });

  it("generates deploy wizard files for each target", () => {
    for (const target of listDeployTargets("coder")) {
      const wizard = generateDeployWizard({ target, project: sampleProject, specialist: "coder" });
      expect(wizard.target).toBe(target);
      expect(wizard.files.length).toBeGreaterThan(0);
      expect(wizard.steps.length).toBeGreaterThan(0);
    }
    for (const target of ["apple-app-store", "google-play-store"] as const) {
      const wizard = generateDeployWizard({ target, project: sampleProject, specialist: "game" });
      expect(wizard.files.some((f) => f.path === "eas.json")).toBe(true);
      expect(wizard.files.some((f) => f.path === "app.json")).toBe(true);
      expect(wizard.steps.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("Forge export & share", () => {
  it("builds a valid ZIP export", () => {
    const zip = buildProjectZip(sampleProject);
    expect(zip.fileCount).toBe(3);
    expect(zip.fileName).toMatch(/\.zip$/);
    expect(zip.sizeBytes).toBeGreaterThan(100);
    expect(zip.base64.length).toBeGreaterThan(100);
    const buf = Buffer.from(zip.base64, "base64");
    expect(buf.slice(0, 2).toString()).toBe("PK");
  });

  it("creates and retrieves share links", () => {
    sweepExpiredShareLinks();
    const link = createShareLink({
      userId: "user-1",
      project: sampleProject,
    });
    expect(link.token).toBeTruthy();
    expect(link.sharePath).toContain("/api/forge/share/");
    const preview = getSharePreview(link.token);
    expect(preview?.projectName).toBe("Demo App");
  });
});

describe("Forge patches & preview", () => {
  it("parses AI patch blocks", () => {
    const text = `\`\`\`json
{"patches":[{"path":"main.js","action":"create","content":"console.log('hi')"}]}
\`\`\``;
    const patches = parsePatchesFromAiReply(text);
    expect(patches?.length).toBe(1);
    expect(patches?.[0]?.path).toBe("main.js");
  });

  it("builds patch diffs", () => {
    const diffs = buildPatchDiffs(sampleProject, [
      { path: "index.html", action: "update", content: "<html><body>Updated</body></html>" },
    ]);
    expect(diffs[0]?.path).toBe("index.html");
    expect(diffs[0]?.action).toBe("update");
  });

  it("builds sandbox preview for HTML projects", () => {
    const preview = buildSandboxPreview(sampleProject);
    expect(preview.kind).toBe("html");
    expect(preview.html).toContain("Hello");
  });
});

describe("Deploy readiness & playtest", () => {
  it("scores deploy readiness", () => {
    const result = assessDeployReadiness({ project: sampleProject, specialist: "coder" });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("runs game playtest checklist", () => {
    const gameProject = {
      ...sampleProject,
      framework: "godot",
      files: [
        ...sampleProject.files,
        { path: "Player.gd", content: "extends CharacterBody2D\nfunc _physics_process(d): pass" },
        { path: "project.godot", content: "[application]\nconfig/name=\"Game\"" },
      ],
    };
    const playtest = runForgePlaytestChecklist(gameProject);
    expect(playtest.score).toBeGreaterThanOrEqual(0);
    expect(playtest.items.length).toBeGreaterThan(0);
  });
});

describe("Hive asset packs", () => {
  it("lists game hive packs with importable files", () => {
    const packs = listHiveAssetPacks("game");
    expect(packs.length).toBeGreaterThan(0);
    const pack = getHiveAssetPack(packs[0]!.id);
    expect(pack?.files.length).toBeGreaterThan(0);
  });
});
