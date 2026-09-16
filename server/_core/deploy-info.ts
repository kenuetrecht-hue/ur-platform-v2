import { hasHostedAndroidApk, hasStaticWebBuild, resolveWebDistPath } from "./static-web";

export function getDeployedGitSha(): string | null {
  const raw = (process.env.GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || "").trim();
  return raw || null;
}

export function getWebDeployHealth(): {
  git: string | null;
  hasWeb: boolean;
  androidApk: boolean;
  dist: string;
} {
  return {
    git: getDeployedGitSha(),
    hasWeb: hasStaticWebBuild(),
    androidApk: hasHostedAndroidApk(),
    dist: resolveWebDistPath(),
  };
}
