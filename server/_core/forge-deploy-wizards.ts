/**
 * One-click deploy config generators — EAS, Vercel, itch.io, App Store, Play Store.
 */

import type { SandboxProject } from "./coder-sandbox-service";
import {
  generateAppleStoreDeploy,
  generateGooglePlayDeploy,
} from "./forge-mobile-store-deploy";

export type DeployTarget =
  | "expo-eas"
  | "apple-app-store"
  | "google-play-store"
  | "vercel"
  | "itch-io"
  | "github-pages";

export type DeployWizardResult = {
  target: DeployTarget;
  label: string;
  files: Array<{ path: string; content: string }>;
  steps: string[];
};

export const DEPLOY_TARGET_LABELS: Record<DeployTarget, string> = {
  "expo-eas": "Expo EAS (iOS + Android)",
  "apple-app-store": "Apple App Store",
  "google-play-store": "Google Play",
  vercel: "Vercel (Web)",
  "itch-io": "itch.io (HTML5)",
  "github-pages": "GitHub Pages",
};

export function generateDeployWizard(params: {
  target: DeployTarget;
  project: SandboxProject;
  specialist: "coder" | "game";
}): DeployWizardResult {
  const slug = params.project.name.toLowerCase().replace(/[^\w]+/g, "-").slice(0, 32) || "my-app";

  switch (params.target) {
    case "apple-app-store": {
      const apple = generateAppleStoreDeploy(params.project);
      return { target: "apple-app-store", ...apple };
    }

    case "google-play-store": {
      const google = generateGooglePlayDeploy(params.project);
      return { target: "google-play-store", ...google };
    }

    case "expo-eas":
      return {
        target: "expo-eas",
        label: "Expo EAS (iOS / Android)",
        files: [
          {
            path: "eas.json",
            content: JSON.stringify(
              {
                cli: { version: ">= 12.0.0" },
                build: {
                  development: { developmentClient: true, distribution: "internal" },
                  preview: { distribution: "internal" },
                  production: { autoIncrement: true },
                },
                submit: { production: {} },
              },
              null,
              2,
            ),
          },
          {
            path: "app.json",
            content: JSON.stringify(
              {
                expo: {
                  name: params.project.name,
                  slug,
                  version: "1.0.0",
                  orientation: "portrait",
                  platforms: ["ios", "android", "web"],
                },
              },
              null,
              2,
            ),
          },
          {
            path: "docs/DEPLOY_EAS.md",
            content: `# Deploy with EAS\n\n1. \`npm install -g eas-cli\`\n2. \`eas login\`\n3. \`eas build:configure\`\n4. \`eas build --platform all\`\n5. \`eas submit\` for store release\n`,
          },
        ],
        steps: [
          "Install EAS CLI and log in",
          "Run eas build --platform all",
          "Use eas submit for App Store / Play Store",
        ],
      };

    case "vercel":
      return {
        target: "vercel",
        label: "Vercel (Web)",
        files: [
          {
            path: "vercel.json",
            content: JSON.stringify(
              { buildCommand: "npm run build", outputDirectory: "dist", framework: null },
              null,
              2,
            ),
          },
          {
            path: "docs/DEPLOY_VERCEL.md",
            content: `# Deploy to Vercel\n\n1. Push repo to GitHub\n2. Import project at vercel.com\n3. Set build command: npm run build\n4. Deploy — live URL in ~2 min\n`,
          },
        ],
        steps: ["Connect GitHub repo", "Import on vercel.com", "Deploy with default Node settings"],
      };

    case "itch-io":
      return {
        target: "itch-io",
        label: "itch.io (HTML5 games)",
        files: [
          {
            path: "docs/DEPLOY_ITCH.md",
            content: `# Publish on itch.io\n\n1. Export HTML5 (or use index.html from this project)\n2. Zip the build folder\n3. Create new project at itch.io\n4. Upload zip, set "This file will be played in the browser"\n5. Embed dimensions: 480×320 or your canvas size\n`,
          },
          {
            path: ".github/workflows/itch-publish.yml",
            content: `name: itch.io build
on:
  workflow_dispatch:
jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: zip -r game.zip index.html game.js assets/ 2>/dev/null || zip -r game.zip .
      - uses: actions/upload-artifact@v4
        with:
          name: itch-build
          path: game.zip
`,
          },
        ],
        steps: [
          "Zip index.html + game.js + assets",
          "Upload to itch.io as HTML game",
          "Use GitHub Action artifact for repeatable builds",
        ],
      };

    case "github-pages":
      return {
        target: "github-pages",
        label: "GitHub Pages (static)",
        files: [
          {
            path: ".github/workflows/pages.yml",
            content: `name: Deploy Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci || npm install
      - run: npm run build || echo "static"
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - uses: actions/deploy-pages@v4
`,
          },
        ],
        steps: ["Enable GitHub Pages in repo settings", "Push to main branch", "Workflow deploys static site"],
      };
  }
}

export function listDeployTargets(specialist: "coder" | "game"): DeployTarget[] {
  if (specialist === "game") {
    return ["apple-app-store", "google-play-store", "expo-eas", "itch-io", "github-pages", "vercel"];
  }
  return ["expo-eas", "vercel", "github-pages"];
}
