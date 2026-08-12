import { buildPlatformPublicUrl } from "@/lib/platform-urls";
import { GAME_FORGE_ID, TECH_BUILDER_ID } from "@/lib/forge-specialists";

export type ForgeHandoffReason =
  | "storage_high"
  | "many_files"
  | "large_file"
  | "large_bundle"
  | "paid_tier";

export type ForgeScaleAssessment = {
  shouldHandoffToWeb: boolean;
  reasons: ForgeHandoffReason[];
  message: string;
};

/** Native app limits — larger work continues on web with full Forge tooling. */
export const FORGE_NATIVE_LIMITS = {
  usagePercent: 60,
  projectFileCount: 20,
  editingFileChars: 48_000,
  estimatedBundleKb: 1200,
} as const;

export function forgeCreatorLabel(creatorId: string): string {
  if (creatorId === GAME_FORGE_ID) return "GameForge";
  if (creatorId === TECH_BUILDER_ID) return "TechBuilder";
  return "Forge";
}

export function buildForgeAisWebPath(creatorId: string, surface: "build" | "learn" | "chat" = "build"): string {
  const group = creatorId === GAME_FORGE_ID ? "tech" : "platform";
  const params = new URLSearchParams({
    group,
    ai: creatorId,
    surface,
  });
  return `/ais?${params.toString()}`;
}

export function buildForgeWebUrl(creatorId: string, surface: "build" | "learn" | "chat" = "build"): string {
  return buildPlatformPublicUrl(buildForgeAisWebPath(creatorId, surface));
}

export function build3dWorkspaceWebPath(options?: {
  project?: "merchandise" | "3d_printing";
  pricing?: boolean;
}): string {
  const params = new URLSearchParams();
  if (options?.project) params.set("project", options.project);
  if (options?.pricing) params.set("pricing", "1");
  const qs = params.toString();
  return qs ? `/3d-workspace?${qs}` : "/3d-workspace";
}

export function build3dWorkspaceWebUrl(options?: {
  project?: "merchandise" | "3d_printing";
  pricing?: boolean;
}): string {
  return buildPlatformPublicUrl(build3dWorkspaceWebPath(options));
}

export function assessForgeProjectScale(input: {
  isNativeApp: boolean;
  creatorId?: string;
  usagePercent?: number;
  projectFileCount?: number;
  editingFileChars?: number;
  estimatedBundleKb?: number;
  tierId?: string;
}): ForgeScaleAssessment {
  if (!input.isNativeApp) {
    return { shouldHandoffToWeb: false, reasons: [], message: "" };
  }

  const reasons: ForgeHandoffReason[] = [];

  if ((input.usagePercent ?? 0) >= FORGE_NATIVE_LIMITS.usagePercent) {
    reasons.push("storage_high");
  }
  if ((input.projectFileCount ?? 0) >= FORGE_NATIVE_LIMITS.projectFileCount) {
    reasons.push("many_files");
  }
  if ((input.editingFileChars ?? 0) >= FORGE_NATIVE_LIMITS.editingFileChars) {
    reasons.push("large_file");
  }
  if ((input.estimatedBundleKb ?? 0) >= FORGE_NATIVE_LIMITS.estimatedBundleKb) {
    reasons.push("large_bundle");
  }
  if (input.tierId && input.tierId !== "starter") {
    reasons.push("paid_tier");
  }

  if (reasons.length === 0) {
    return { shouldHandoffToWeb: false, reasons: [], message: "" };
  }

  const parts: string[] = [];
  if (reasons.includes("storage_high")) parts.push("sandbox storage is getting full");
  if (reasons.includes("many_files")) parts.push("this project has many files");
  if (reasons.includes("large_file")) parts.push("the current file is very large");
  if (reasons.includes("large_bundle")) parts.push("the build size is large");
  if (reasons.includes("paid_tier")) parts.push("your upgraded sandbox tier works best on web");

  const label = forgeCreatorLabel(input.creatorId ?? TECH_BUILDER_ID);

  return {
    shouldHandoffToWeb: true,
    reasons,
    message: `This ${label} project is getting big (${parts.join(", ")}). Finish on the website for the full editor, Forge agent, GitHub sync, and deploy tools.`,
  };
}
