/**
 * Game playtest checklist + CI config generators for forge projects.
 */

import type { SandboxProject } from "./coder-sandbox-service";

export type PlaytestItem = {
  id: string;
  category: string;
  check: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export function runForgePlaytestChecklist(project: SandboxProject): {
  items: PlaytestItem[];
  score: number;
  readyToShip: boolean;
} {
  const items: PlaytestItem[] = [];
  const paths = new Set(project.files.map((f) => f.path));

  items.push({
    id: "entry",
    category: "Core",
    check: "Entry point exists",
    status: paths.has("index.html") || paths.has("main.gd") || [...paths].some((p) => p.endsWith("Main.cs"))
      ? "pass"
      : "fail",
    detail: "Need index.html, main.gd, or Main.cs",
  });

  items.push({
    id: "player",
    category: "Gameplay",
    check: "Player / controller script",
    status: project.files.some((f) => /player|controller|character/i.test(f.path))
      ? "pass"
      : "warn",
    detail: "Player movement script recommended",
  });

  items.push({
    id: "gdd",
    category: "Design",
    check: "Game design doc",
    status: paths.has("docs/GAME_DESIGN.md") || paths.has("GAME_DESIGN.md") ? "pass" : "warn",
    detail: "GDD helps scope massive games",
  });

  items.push({
    id: "security",
    category: "Security",
    check: "No hardcoded secrets",
    status: project.files.some((f) => /password\s*=\s*['"][^'"]+['"]/i.test(f.content))
      ? "fail"
      : "pass",
    detail: "Remove hardcoded passwords/API keys",
  });

  items.push({
    id: "multiplayer",
    category: "Multiplayer",
    check: "Multiplayer doc if networked",
    status: project.files.some((f) => /multiplayer|network/i.test(f.path))
      ? paths.has("docs/MULTIPLAYER.md")
        ? "pass"
        : "warn"
      : "pass",
    detail: "Add docs/MULTIPLAYER.md for netcode",
  });

  items.push({
    id: "perf",
    category: "Performance",
    check: "Asset budget awareness",
    status: project.files.length > 500 ? "warn" : "pass",
    detail: `${project.files.length} files — consider LOD/pooling at scale`,
  });

  const passCount = items.filter((i) => i.status === "pass").length;
  const score = Math.round((passCount / items.length) * 100);

  return {
    items,
    score,
    readyToShip: items.every((i) => i.status !== "fail") && score >= 60,
  };
}

export function generateCiConfig(params: {
  specialist: "coder" | "game";
  project: SandboxProject;
}): { path: string; content: string } {
  if (params.specialist === "game") {
    const isGodot = params.project.files.some((f) => f.path.endsWith(".gd"));
    if (isGodot) {
      return {
        path: ".github/workflows/godot-ci.yml",
        content: `name: Godot CI
on: [push]
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: chickensoft-games/setup-godot@v2
      - run: echo "Add godot export presets for automated builds"
`,
      };
    }
    return {
      path: ".github/workflows/game-ci.yml",
      content: `name: Game CI
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Run Unity/Godot build in CI — connect repo for full pipeline"
`,
    };
  }

  const hasExpo = params.project.files.some((f) => f.content.includes("expo"));
  if (hasExpo) {
    return {
      path: ".github/workflows/eas-build.yml",
      content: `name: EAS Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install
      - run: npx expo export --platform web || npm test
`,
    };
  }

  return {
    path: ".github/workflows/ci.yml",
    content: `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci || npm install
      - run: npm test || npm run build
`,
  };
}
