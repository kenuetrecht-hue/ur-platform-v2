/**
 * AI-generated promotional videos — unlocked once platform revenue threshold is met.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { getCreatorAi } from "./ai-creator-registry";
import { getOwnerSessionStats } from "./ai-live-session-service";

/** Default: unlock after $1,000 platform revenue (override via env). */
const DEFAULT_MIN_REVENUE_CENTS = 100_000;

export type CreatorVideoJobStatus = "queued" | "processing" | "ready" | "failed";

export type CreatorVideoJob = {
  id: string;
  creatorAiId: string;
  creatorName: string;
  topic: string;
  hook: string;
  status: CreatorVideoJobStatus;
  createdAt: string;
  completedAt?: string;
  /** Placeholder until real video pipeline (Runway, Sora, etc.) is wired. */
  previewUrl?: string;
  shareCaption: string;
};

const videoJobs = new Map<string, CreatorVideoJob>();

function minRevenueCents(): number {
  const raw = process.env.PLATFORM_VIDEO_GEN_MIN_REVENUE_CENTS;
  if (raw == null || raw === "") return DEFAULT_MIN_REVENUE_CENTS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIN_REVENUE_CENTS;
}

export function getPlatformRevenueCents(): number {
  return getOwnerSessionStats().estimatedRevenueCents;
}

export function getVideoGenerationStatus() {
  const revenueCents = getPlatformRevenueCents();
  const thresholdCents = minRevenueCents();
  const unlocked = revenueCents >= thresholdCents;
  return {
    unlocked,
    revenueCents,
    revenueUsd: (revenueCents / 100).toFixed(2),
    thresholdCents,
    thresholdUsd: (thresholdCents / 100).toFixed(2),
    remainingCents: Math.max(0, thresholdCents - revenueCents),
    remainingUsd: (Math.max(0, thresholdCents - revenueCents) / 100).toFixed(2),
    message: unlocked
      ? "AI video generation is active — creators can publish short clips to attract followers."
      : `Video generation unlocks at $${(thresholdCents / 100).toFixed(2)} platform revenue ($${(Math.max(0, thresholdCents - revenueCents) / 100).toFixed(2)} to go).`,
  };
}

export function assertVideoGenerationUnlocked(): void {
  const status = getVideoGenerationStatus();
  if (!status.unlocked) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: status.message,
    });
  }
}

function buildShareCaption(creatorName: string, topic: string): string {
  return `New from ${creatorName} on UR Platform 🎬 ${topic} — follow for live classes and more. #URPlatform #AICreator`;
}

export function requestCreatorVideo(params: {
  creatorAiId: string;
  topic: string;
  style?: "teaser" | "lesson_clip" | "follow_cta";
}): CreatorVideoJob {
  assertVideoGenerationUnlocked();
  const creator = getCreatorAi(params.creatorAiId);
  if (!creator) {
    throw new TRPCError({ code: "NOT_FOUND", message: "AI specialist not found." });
  }
  const topic = params.topic.trim().slice(0, 300);
  if (!topic) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Video topic is required." });
  }

  const id = randomUUID();
  const style = params.style ?? "follow_cta";
  const job: CreatorVideoJob = {
    id,
    creatorAiId: params.creatorAiId,
    creatorName: creator.name,
    topic,
    hook:
      style === "teaser"
        ? `Quick teaser: ${topic}`
        : style === "lesson_clip"
          ? `Free clip from our class: ${topic}`
          : `Follow ${creator.name} — ${topic}`,
    status: "ready",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    previewUrl: `urplatform://creator-video/${id}`,
    shareCaption: buildShareCaption(creator.name, topic),
  };
  videoJobs.set(id, job);
  return job;
}

export function listCreatorVideos(creatorAiId?: string): CreatorVideoJob[] {
  let list = [...videoJobs.values()];
  if (creatorAiId) list = list.filter((j) => j.creatorAiId === creatorAiId);
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCreatorVideo(jobId: string): CreatorVideoJob | null {
  return videoJobs.get(jobId) ?? null;
}
