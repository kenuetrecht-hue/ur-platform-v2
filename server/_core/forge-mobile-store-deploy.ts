/**
 * Mobile store deploy configs — simple games to Apple App Store & Google Play via EAS.
 */

import type { SandboxProject } from "./coder-sandbox-service";

export type MobileStorePlatform = "apple" | "google";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^\w]+/g, "-").slice(0, 32) || "my-game";
}

function bundleId(project: SandboxProject): string {
  return `com.urplatform.${slugify(project.name)}`;
}

export function generateAppleStoreDeploy(project: SandboxProject): {
  label: string;
  files: Array<{ path: string; content: string }>;
  steps: string[];
} {
  const slug = slugify(project.name);
  const bundle = bundleId(project);

  return {
    label: "Apple App Store (iOS)",
    files: [
      {
        path: "eas.json",
        content: JSON.stringify(
          {
            cli: { version: ">= 12.0.0", appVersionSource: "remote" },
            build: {
              development: { developmentClient: true, distribution: "internal", ios: { simulator: true } },
              preview: { distribution: "internal", ios: { simulator: false } },
              production: {
                autoIncrement: true,
                ios: { resourceClass: "m-medium" },
              },
            },
            submit: {
              production: {
                ios: {
                  appleId: "YOUR_APPLE_ID@email.com",
                  ascAppId: "YOUR_APP_STORE_CONNECT_APP_ID",
                  appleTeamId: "YOUR_TEAM_ID",
                },
              },
            },
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
              name: project.name,
              slug,
              version: "1.0.0",
              orientation: "portrait",
              icon: "./assets/icon.png",
              userInterfaceStyle: "automatic",
              splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#0f172a" },
              ios: {
                supportsTablet: true,
                bundleIdentifier: bundle,
                buildNumber: "1",
                infoPlist: {
                  ITSAppUsesNonExemptEncryption: false,
                  NSUserTrackingUsageDescription:
                    "This game does not track you across apps. Update if you add analytics.",
                },
              },
              android: {
                package: bundle,
                versionCode: 1,
                adaptiveIcon: {
                  foregroundImage: "./assets/adaptive-icon.png",
                  backgroundColor: "#0f172a",
                },
              },
              platforms: ["ios", "android"],
              extra: { eas: { projectId: "YOUR_EAS_PROJECT_ID" } },
            },
          },
          null,
          2,
        ),
      },
      {
        path: "store/apple/description.txt",
        content: `${project.name}\n\nA simple mobile game built with GameForge on UR Platform.\n\nTap to play, beat your high score, and share with friends.`,
      },
      {
        path: "store/apple/keywords.txt",
        content: "game,arcade,casual,mobile,puzzle,score",
      },
      {
        path: "store/apple/privacy-policy-url.txt",
        content: "https://your-site.com/privacy\n\nReplace with your privacy policy URL before App Store review.",
      },
      {
        path: "assets/README.md",
        content: `# Store assets\n\nRequired before submit:\n- icon.png — 1024×1024\n- splash.png — 1284×2778 recommended\n- adaptive-icon.png — 1024×1024 (Android)\n\nGenerate with GameForge or your design tool.`,
      },
      {
        path: "docs/DEPLOY_APPLE.md",
        content: `# Ship to Apple App Store\n\n## Prerequisites\n- Apple Developer account ($99/year)\n- Mac not required — EAS builds in the cloud\n\n## Steps\n1. \`npm install -g eas-cli && eas login\`\n2. \`eas init\` — link this project to Expo\n3. Add icon.png and splash.png under \`assets/\`\n4. Update \`app.json\` → \`ios.bundleIdentifier\` (unique)\n5. \`eas build --platform ios --profile production\`\n6. In App Store Connect: create app, fill metadata from \`store/apple/\`\n7. \`eas submit --platform ios --profile production\`\n8. Submit for review in App Store Connect\n\n## Review tips\n- Simple games: declare no encryption (ITSAppUsesNonExemptEncryption: false)\n- Provide a test account if login is required\n- Privacy policy URL must be live\n`,
      },
      {
        path: ".github/workflows/eas-ios.yml",
        content: `name: EAS iOS build
on:
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci || npm install
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform ios --profile production --non-interactive
`,
      },
    ],
    steps: [
      "Create Apple Developer account & App Store Connect app",
      "Add app icon (1024×1024) and splash under assets/",
      "Run: eas build --platform ios --profile production",
      "Run: eas submit — then submit for review in App Store Connect",
    ],
  };
}

export function generateGooglePlayDeploy(project: SandboxProject): {
  label: string;
  files: Array<{ path: string; content: string }>;
  steps: string[];
} {
  const slug = slugify(project.name);
  const bundle = bundleId(project);

  return {
    label: "Google Play (Android)",
    files: [
      {
        path: "eas.json",
        content: JSON.stringify(
          {
            cli: { version: ">= 12.0.0", appVersionSource: "remote" },
            build: {
              development: { developmentClient: true, distribution: "internal" },
              preview: { distribution: "internal", android: { buildType: "apk" } },
              production: {
                autoIncrement: true,
                android: { buildType: "app-bundle" },
              },
            },
            submit: {
              production: {
                android: {
                  serviceAccountKeyPath: "./store/google/play-service-account.json",
                  track: "internal",
                },
              },
            },
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
              name: project.name,
              slug,
              version: "1.0.0",
              orientation: "portrait",
              icon: "./assets/icon.png",
              userInterfaceStyle: "automatic",
              splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#0f172a" },
              android: {
                package: bundle,
                versionCode: 1,
                permissions: [],
                adaptiveIcon: {
                  foregroundImage: "./assets/adaptive-icon.png",
                  backgroundColor: "#0f172a",
                },
              },
              ios: {
                bundleIdentifier: bundle,
                supportsTablet: true,
              },
              platforms: ["ios", "android"],
              extra: { eas: { projectId: "YOUR_EAS_PROJECT_ID" } },
            },
          },
          null,
          2,
        ),
      },
      {
        path: "store/google/short-description.txt",
        content: `Simple arcade fun — ${project.name}. Built with GameForge.`,
      },
      {
        path: "store/google/full-description.txt",
        content: `${project.name}\n\nA casual mobile game you can pick up and play in seconds.\n\n• Touch controls\n• Score tracking\n• Lightweight — runs on most phones\n\nBuilt with GameForge on UR Platform.`,
      },
      {
        path: "store/google/content-rating-notes.txt",
        content: "No violence, gambling, or user-generated content. Suitable for all ages (Everyone / PEGI 3).",
      },
      {
        path: "store/google/play-service-account.README",
        content: "Download JSON key from Google Play Console → Setup → API access → Service accounts. Save as play-service-account.json (do not commit — add to .gitignore).",
      },
      {
        path: "assets/README.md",
        content: `# Store assets\n\nRequired before submit:\n- icon.png — 512×512 minimum (1024×1024 recommended)\n- adaptive-icon.png — foreground 1024×1024\n- Feature graphic: 1024×500 (upload in Play Console)\n\nScreenshots: at least 2 phone screenshots (1080×1920 or similar).`,
      },
      {
        path: "docs/DEPLOY_GOOGLE.md",
        content: `# Ship to Google Play\n\n## Prerequisites\n- Google Play Developer account ($25 one-time)\n- Expo account (free tier works for simple games)\n\n## Steps\n1. \`npm install -g eas-cli && eas login\`\n2. \`eas init\` — link project\n3. Add \`assets/icon.png\` and \`assets/adaptive-icon.png\`\n4. Update \`android.package\` in app.json (unique reverse-DNS id)\n5. \`eas build --platform android --profile production\`\n6. Play Console → Create app → Store listing (copy from \`store/google/\`)\n7. Complete content rating questionnaire (see content-rating-notes.txt)\n8. Upload AAB from EAS or run \`eas submit --platform android\`\n9. Start with Internal testing → Production when ready\n\n## Tips\n- Use app-bundle (AAB) for Play Store — configured in eas.json\n- First release may take 1–3 days for review\n`,
      },
      {
        path: ".github/workflows/eas-android.yml",
        content: `name: EAS Android build
on:
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci || npm install
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform android --profile production --non-interactive
`,
      },
    ],
    steps: [
      "Create Google Play Developer account",
      "Add icon and adaptive-icon under assets/",
      "Run: eas build --platform android --profile production",
      "Upload AAB & complete store listing in Play Console",
    ],
  };
}

export function assessMobileStoreReadiness(project: SandboxProject): {
  appleReady: boolean;
  googleReady: boolean;
  items: Array<{ id: string; label: string; status: "pass" | "warn" | "fail"; detail: string }>;
} {
  const paths = new Set(project.files.map((f) => f.path));
  const items = [
    {
      id: "app-json",
      label: "app.json (Expo config)",
      status: paths.has("app.json") ? ("pass" as const) : ("fail" as const),
      detail: "Required for EAS mobile builds",
    },
    {
      id: "eas-json",
      label: "eas.json (build profiles)",
      status: paths.has("eas.json") ? ("pass" as const) : ("fail" as const),
      detail: "EAS Build configuration",
    },
    {
      id: "package-json",
      label: "package.json",
      status: paths.has("package.json") ? ("pass" as const) : ("warn" as const),
      detail: "npm dependencies for Expo",
    },
    {
      id: "entry",
      label: "App entry (App.tsx)",
      status: paths.has("App.tsx") || paths.has("app/index.tsx") ? ("pass" as const) : ("warn" as const),
      detail: "React Native game entry point",
    },
    {
      id: "icons",
      label: "Store icon assets",
      status:
        paths.has("assets/icon.png") || paths.has("assets/README.md")
          ? ("pass" as const)
          : ("warn" as const),
      detail: "icon.png 1024×1024 before submit",
    },
    {
      id: "apple-meta",
      label: "Apple store metadata",
      status: paths.has("store/apple/description.txt") ? ("pass" as const) : ("warn" as const),
      detail: "store/apple/ listing copy",
    },
    {
      id: "google-meta",
      label: "Google Play metadata",
      status: paths.has("store/google/short-description.txt") ? ("pass" as const) : ("warn" as const),
      detail: "store/google/ listing copy",
    },
  ];

  const appleCore = items.filter((i) => ["app-json", "eas-json", "entry"].includes(i.id));
  const googleCore = appleCore;
  const appleReady = appleCore.every((i) => i.status === "pass");
  const googleReady = googleCore.every((i) => i.status === "pass");

  return { appleReady, googleReady, items };
}
