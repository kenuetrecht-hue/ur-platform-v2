/**
 * Cartoon Studio — prepaid Draft (assemble + editor) or Cinema (film-engine).
 * Customers pay before anything is built. Owner is complimentary.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  buildCartoonFrameSvg,
  CARTOON_MAX_SCENES,
  CARTOON_MAX_SECONDS,
  CARTOON_MIN_SCENES,
  fallbackCartoonStoryboard,
  isCartoonStyleId,
  type CartoonMusicMood,
  type CartoonProject,
  type CartoonScene,
  type CartoonStyleId,
} from "../../lib/cartoon-studio";
import {
  quoteCartoonStudio,
  type CartoonStudioQuote,
  type CartoonStudioTierId,
} from "../../lib/cartoon-studio-pricing";
import { assertNoAiTakeoverInMessage } from "./ai-control";
import { assertUserCanUseAi } from "./ai-guardrails";
import { assertMessageWithinAiRole, buildRoleMissionPrompt } from "./ai-roles";
import { generateGoogleChatReply, isGoogleCloudAiConfigured } from "./google-ai";
import { sanitizeUserText } from "./input-sanitize";
import {
  AI_ADMINISTRATOR_CONTROL_PROMPT,
  AI_BOUNDARY_PROMPT,
  MULTILINGUAL_CAPABILITY_PROMPT,
} from "./multilingual-prompts";

const projects = new Map<string, CartoonProject>();
const MAX_PROJECTS_PER_USER = 20;
const MUSIC_MOODS = new Set<CartoonMusicMood>(["none", "upbeat", "calm", "lesson"]);

export function _resetCartoonStudioForTests(): void {
  projects.clear();
}

function listUserProjects(userId: string): CartoonProject[] {
  return [...projects.values()]
    .filter((project) => project.userId === userId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function engineNoteFor(tierId: CartoonStudioTierId): string {
  if (tierId === "draft") {
    return "Draft Studio: assembled cartoon scenes plus the multi-track editor. No film-engine seconds were purchased.";
  }
  if (tierId === "lite") {
    return "Lite Motion: you prepaid a cheaper 720p-class engine. Lower polish than Mid or Cinema. If the engine key is offline, you still receive the paid Lite assemble — no refunds.";
  }
  if (tierId === "mid") {
    return "Mid Motion: you prepaid a faster 1080p-class engine. Sharper than Lite, not Cinema quality. If the engine key is offline, you still receive the paid Mid assemble — no refunds.";
  }
  if (tierId === "premiere") {
    return "Premiere 4K: you prepaid the highest-resolution quality-engine seconds we sell. This is not a Hollywood movie. If the engine key is offline, you still receive the paid 4K-class assemble — no refunds.";
  }
  return (
    "Cinema Engine: you prepaid 1080p quality-engine seconds. If the engine key is offline, you still receive the paid cinema assemble — no refunds either way."
  );
}

function attachFrames(
  style: CartoonStyleId,
  scenes: Array<Partial<CartoonScene> & { narration?: string; title?: string; durationSeconds?: number }>,
  tier: CartoonStudioTierId,
  billedSeconds: number,
): CartoonScene[] {
  const built = scenes.slice(0, CARTOON_MAX_SCENES).map((scene, index) => {
    const order = index + 1;
    const title = sanitizeUserText(scene.title || `Scene ${order}`, 80);
    const narration = sanitizeUserText(scene.narration ?? "", 280);
    const caption = sanitizeUserText(scene.caption || narration, 160);
    const musicMood = MUSIC_MOODS.has(scene.musicMood as CartoonMusicMood)
      ? (scene.musicMood as CartoonMusicMood)
      : "upbeat";
    return {
      id: scene.id ?? randomUUID(),
      order,
      title,
      narration,
      caption,
      durationSeconds: Math.min(12, Math.max(3, Math.round(scene.durationSeconds || 5))),
      visualPrompt: sanitizeUserText(scene.visualPrompt || narration, 220),
      frameSvg: buildCartoonFrameSvg({ title, narration, style, order, tier }),
      voiceEnabled: scene.voiceEnabled !== false,
      musicMood,
      musicVolume: Math.min(100, Math.max(0, Math.round(scene.musicVolume ?? 40))),
    };
  });
  return fitScenesToPaidSeconds(built, billedSeconds).map((scene) => ({
    ...scene,
    frameSvg: buildCartoonFrameSvg({
      title: scene.title,
      narration: scene.narration,
      style,
      order: scene.order,
      tier,
    }),
  }));
}

function fitScenesToPaidSeconds(scenes: CartoonScene[], billedSeconds: number): CartoonScene[] {
  const cap = Math.max(4, billedSeconds);
  const minPer = cap < 16 ? 2 : 3;
  const maxScenes = Math.max(2, Math.min(scenes.length, Math.floor(cap / minPer)));
  const kept = scenes.slice(0, maxScenes);
  const base = Math.floor(cap / kept.length);
  let leftover = cap - base * kept.length;
  return kept.map((scene, index) => {
    const durationSeconds = base + (leftover > 0 ? 1 : 0);
    leftover -= leftover > 0 ? 1 : 0;
    return { ...scene, order: index + 1, durationSeconds };
  });
}

function parseStoryboardJson(raw: string): {
  title?: string;
  script?: string;
  scenes?: Array<{ title?: string; narration?: string; durationSeconds?: number; visualPrompt?: string }>;
} | null {
  const fenced = raw.match(/\{[\s\S]*\}/);
  if (!fenced) return null;
  try {
    return JSON.parse(fenced[0]) as {
      title?: string;
      script?: string;
      scenes?: Array<{ title?: string; narration?: string; durationSeconds?: number; visualPrompt?: string }>;
    };
  } catch {
    return null;
  }
}

async function draftStoryboard(params: {
  idea: string;
  style: CartoonStyleId;
}): Promise<{ title: string; script: string; scenes: Omit<CartoonScene, "id" | "frameSvg">[] }> {
  const fallback = fallbackCartoonStoryboard(params);
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") return fallback;
  if (!isGoogleCloudAiConfigured()) return fallback;

  try {
    const result = await generateGoogleChatReply({
      systemPrompt: [
        AI_ADMINISTRATOR_CONTROL_PROMPT,
        AI_BOUNDARY_PROMPT,
        MULTILINGUAL_CAPABILITY_PROMPT,
        buildRoleMissionPrompt("contentmate"),
        "You write short cartoon video storyboards for UR Cartoon Studio.",
        "Return ONLY JSON: {\"title\":\"\",\"script\":\"\",\"scenes\":[{\"title\":\"\",\"narration\":\"\",\"durationSeconds\":5,\"visualPrompt\":\"\"}]}",
        `Use ${CARTOON_MIN_SCENES} to ${CARTOON_MAX_SCENES} scenes. Keep the whole cartoon under ${CARTOON_MAX_SECONDS} seconds.`,
        "Family-safe teaching or entertainment only. No weapons, crime how-to, or adult content.",
        `Style: ${params.style}.`,
      ].join("\n"),
      history: [],
      message: params.idea,
      temperature: 0.6,
      maxOutputTokens: 1200,
    });
    const parsed = parseStoryboardJson(result.reply);
    const rawScenes = parsed?.scenes?.filter((scene) => (scene.narration ?? "").trim().length > 3) ?? [];
    if (rawScenes.length < CARTOON_MIN_SCENES) return fallback;
    return {
      title: sanitizeUserText(parsed?.title || fallback.title, 80),
      script: sanitizeUserText(parsed?.script || rawScenes.map((s) => s.narration).join(" "), 4000),
      scenes: rawScenes.slice(0, CARTOON_MAX_SCENES).map((scene, index) => ({
        order: index + 1,
        title: scene.title || `Scene ${index + 1}`,
        narration: scene.narration || "",
        caption: (scene.narration || "").slice(0, 120),
        durationSeconds: scene.durationSeconds ?? 5,
        visualPrompt: scene.visualPrompt || scene.narration || "",
        voiceEnabled: true,
        musicMood: params.style === "educational" ? "lesson" : "upbeat",
        musicVolume: 40,
      })),
    };
  } catch {
    return fallback;
  }
}

function assertPaidOrOwner(params: {
  isPlatformOwner: boolean;
  quote?: CartoonStudioQuote;
}): CartoonStudioQuote {
  if (params.isPlatformOwner) {
    return params.quote ?? quoteCartoonStudio("draft", 16);
  }
  if (!params.quote) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Pay for Draft, Lite, Mid, Cinema, or Premiere before the cartoon is built. There is no free render.",
    });
  }
  return params.quote;
}

export async function createCartoonVideo(params: {
  userId: string;
  isPlatformOwner: boolean;
  idea: string;
  style: CartoonStyleId;
  quote?: CartoonStudioQuote;
  complimentary?: boolean;
}): Promise<CartoonProject> {
  assertUserCanUseAi(params.userId, params.isPlatformOwner);
  const idea = sanitizeUserText(params.idea, 2000);
  if (idea.length < 8) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tell the studio what the cartoon is about." });
  }
  if (!isCartoonStyleId(params.style)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a cartoon style." });
  }
  assertNoAiTakeoverInMessage(idea, params.isPlatformOwner);
  assertMessageWithinAiRole(idea, "contentmate", params.isPlatformOwner);

  const quote = assertPaidOrOwner({
    isPlatformOwner: params.isPlatformOwner,
    quote: params.quote,
  });

  const owned = listUserProjects(params.userId);
  if (owned.length >= MAX_PROJECTS_PER_USER) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You already have 20 cartoons. Delete one before making another.",
    });
  }

  const draft = await draftStoryboard({ idea, style: params.style });
  const scenes = attachFrames(params.style, draft.scenes, quote.tierId, quote.billedSeconds);
  const totalSeconds = Math.min(
    quote.billedSeconds,
    scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
  );
  const now = new Date().toISOString();
  const project: CartoonProject = {
    id: randomUUID(),
    userId: params.userId,
    title: draft.title,
    idea,
    style: params.style,
    script: draft.script,
    scenes,
    totalSeconds,
    tier: quote.tierId,
    billedSeconds: quote.billedSeconds,
    paid: true,
    complimentary: Boolean(params.isPlatformOwner && params.complimentary !== false && !params.quote),
    renderStatus: "complete",
    engineNote: engineNoteFor(quote.tierId),
    createdAt: now,
    updatedAt: now,
  };
  projects.set(project.id, project);
  return project;
}

export type CartoonTimelineEdit = {
  sceneId: string;
  title?: string;
  narration?: string;
  caption?: string;
  durationSeconds?: number;
  voiceEnabled?: boolean;
  musicMood?: CartoonMusicMood;
  musicVolume?: number;
};

export function updateCartoonTimeline(params: {
  userId: string;
  projectId: string;
  sceneOrder?: string[];
  edits?: CartoonTimelineEdit[];
}): CartoonProject {
  const project = getCartoonVideo(params.userId, params.projectId);
  if (!project.paid) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Pay first. The editor unlocks after checkout." });
  }

  let scenes = [...project.scenes];
  if (params.sceneOrder?.length) {
    const next = params.sceneOrder
      .map((id) => scenes.find((scene) => scene.id === id))
      .filter((scene): scene is CartoonScene => Boolean(scene));
    if (next.length !== scenes.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Scene order must include every scene once." });
    }
    scenes = next.map((scene, index) => ({ ...scene, order: index + 1 }));
  }

  for (const edit of params.edits ?? []) {
    const index = scenes.findIndex((scene) => scene.id === edit.sceneId);
    if (index < 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "That scene is not on this cartoon." });
    }
    const current = scenes[index]!;
    const title = edit.title != null ? sanitizeUserText(edit.title, 80) : current.title;
    const narration = edit.narration != null ? sanitizeUserText(edit.narration, 280) : current.narration;
    const caption = edit.caption != null ? sanitizeUserText(edit.caption, 160) : current.caption;
    const musicMood =
      edit.musicMood && MUSIC_MOODS.has(edit.musicMood) ? edit.musicMood : current.musicMood;
    scenes[index] = {
      ...current,
      title,
      narration,
      caption,
      durationSeconds:
        edit.durationSeconds != null
          ? Math.min(12, Math.max(3, Math.round(edit.durationSeconds)))
          : current.durationSeconds,
      voiceEnabled: edit.voiceEnabled ?? current.voiceEnabled,
      musicMood,
      musicVolume:
        edit.musicVolume != null
          ? Math.min(100, Math.max(0, Math.round(edit.musicVolume)))
          : current.musicVolume,
      frameSvg: buildCartoonFrameSvg({
        title,
        narration,
        style: project.style,
        order: current.order,
        tier: project.tier,
      }),
    };
  }

  const nextTotal = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  if (nextTotal > project.billedSeconds) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `You prepaid ${project.billedSeconds} seconds. Shorten another scene first, or buy a longer job. No refunds on unused time.`,
    });
  }

  const updated: CartoonProject = {
    ...project,
    scenes,
    totalSeconds: nextTotal,
    updatedAt: new Date().toISOString(),
  };
  projects.set(updated.id, updated);
  return updated;
}

export function listCartoonVideos(userId: string): CartoonProject[] {
  return listUserProjects(userId);
}

export function getCartoonVideo(userId: string, projectId: string): CartoonProject {
  const project = projects.get(projectId);
  if (!project || project.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Cartoon not found." });
  }
  return project;
}

export function deleteCartoonVideo(userId: string, projectId: string): { ok: true } {
  const project = projects.get(projectId);
  if (!project || project.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Cartoon not found." });
  }
  projects.delete(projectId);
  return { ok: true };
}
