/**
 * Pre-ship readiness report for forge projects.
 */

import type { SandboxProject } from "./coder-sandbox-service";
import { assessMobileStoreReadiness } from "./forge-mobile-store-deploy";

export type DeployReadinessItem = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export function assessDeployReadiness(params: {
  specialist: "coder" | "game";
  project: SandboxProject;
}): {
  score: number;
  ready: boolean;
  items: DeployReadinessItem[];
  recommendations: string[];
  mobileStores?: {
    appleReady: boolean;
    googleReady: boolean;
  };
} {
  const items: DeployReadinessItem[] = [];
  const paths = new Set(params.project.files.map((f) => f.path));

  items.push({
    id: "files",
    label: "Project has source files",
    status: params.project.files.length > 0 ? "pass" : "fail",
    detail: `${params.project.files.length} file(s)`,
  });

  items.push({
    id: "ci",
    label: "CI workflow present",
    status: [...paths].some((p) => p.includes(".github/workflows")) ? "pass" : "warn",
    detail: "Generate CI from Build tab",
  });

  items.push({
    id: "secrets",
    label: "No hardcoded secrets",
    status: params.project.files.some((f) =>
      /(?:api[_-]?key|password|secret)\s*=\s*['"][^'"]{8,}['"]/i.test(f.content),
    )
      ? "fail"
      : "pass",
    detail: "Scan for hardcoded credentials",
  });

  if (params.specialist === "coder") {
    items.push({
      id: "pkg",
      label: "package.json defined",
      status: paths.has("package.json") ? "pass" : "warn",
      detail: "Required for npm build/deploy",
    });
    items.push({
      id: "entry",
      label: "App entry point",
      status:
        paths.has("App.tsx") || paths.has("src/App.tsx") || paths.has("index.tsx")
          ? "pass"
          : "warn",
      detail: "App.tsx or index.tsx",
    });
  } else {
    items.push({
      id: "gdd",
      label: "Game design document",
      status: paths.has("docs/GAME_DESIGN.md") ? "pass" : "warn",
      detail: "docs/GAME_DESIGN.md",
    });
    items.push({
      id: "playable",
      label: "Playable entry",
      status:
        paths.has("index.html") ||
        paths.has("App.tsx") ||
        paths.has("main.gd") ||
        [...paths].some((p) => p.endsWith("Main.cs"))
          ? "pass"
          : "warn",
      detail: "HTML5, Expo mobile, Godot, or Unity entry",
    });
  }

  const recommendations: string[] = [];
  if (items.some((i) => i.id === "ci" && i.status === "warn")) {
    recommendations.push("Generate GitHub Actions CI from the Build tab.");
  }
  if (items.some((i) => i.id === "secrets" && i.status === "fail")) {
    recommendations.push("Move secrets to environment variables — never commit keys.");
  }
  if (params.specialist === "game" && items.some((i) => i.id === "playable" && i.status === "warn")) {
    recommendations.push("Use the HTML5 template for instant playable preview.");
  }
  if (params.specialist === "game" && !paths.has("App.tsx") && !paths.has("app.json")) {
    recommendations.push(
      "For Apple & Google: start from the “Simple mobile game (iOS & Android)” template, then run store deploy wizards.",
    );
  }

  let mobileStores: { appleReady: boolean; googleReady: boolean } | undefined;
  if (params.specialist === "game") {
    const mobile = assessMobileStoreReadiness(params.project);
    mobileStores = { appleReady: mobile.appleReady, googleReady: mobile.googleReady };
    for (const m of mobile.items) {
      if (!items.some((i) => i.id === m.id)) {
        items.push(m);
      }
    }
    if (!mobile.appleReady) {
      recommendations.push("Run Deploy → Apple App Store to generate eas.json and store metadata.");
    }
    if (!mobile.googleReady) {
      recommendations.push("Run Deploy → Google Play to generate AAB build config and listing copy.");
    }
  }

  const pass = items.filter((i) => i.status === "pass").length;
  const fail = items.filter((i) => i.status === "fail").length;
  const score = Math.round((pass / items.length) * 100);
  const ready = fail === 0 && score >= 70;

  return { score, ready, items, recommendations, mobileStores };
}
