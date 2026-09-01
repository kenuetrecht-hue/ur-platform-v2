/**
 * Business Steward commissions public specialists to produce UR-owned catalog work.
 * Owner-only. Specialists stay on-role. Video files stay scripts until video gen unlocks.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  STEWARD_KIND_LABEL,
  STEWARD_KIND_SPECIALIST,
  STEWARD_WORK_CREW,
  type StewardWorkKind,
} from "../../lib/steward-commission-types";
import { sanitizeUserText } from "./input-sanitize";
import { assertNoAiTakeoverInMessage } from "./ai-control";
import { assertMessageWithinAiRole } from "./ai-roles";
import { buildCreatorSystemPrompt, getCreatorAi } from "./ai-creator-registry";
import { generateGoogleChatReply } from "./google-ai";
import { getVideoGenerationStatus } from "./ai-creator-video-service";

export type StewardCommissionJob = {
  id: string;
  kind: StewardWorkKind;
  specialistId: string;
  specialistName: string;
  brief: string;
  title: string;
  body: string;
  status: "ready" | "failed";
  createdAt: string;
  videoNote: string;
};

const jobs = new Map<string, StewardCommissionJob>();

type GenerateFn = typeof generateGoogleChatReply;
let generateWork: GenerateFn = generateGoogleChatReply;

export function _setStewardCommissionGeneratorForTests(fn: GenerateFn | null): void {
  generateWork = fn ?? generateGoogleChatReply;
}

export function _resetStewardCommissionsForTests(): void {
  jobs.clear();
  generateWork = generateGoogleChatReply;
}

export function detectStewardWorkTargets(message: string): Array<{
  kind: StewardWorkKind;
  specialistId: string;
}> {
  const text = message.toLowerCase();
  const asked =
    /\b(have|ask|tell|commission|assign|get|make|write|produce|create|draft|put on|work with|talk to)\b/.test(
      text,
    );
  const targets: Array<{ kind: StewardWorkKind; specialistId: string }> = [];
  const add = (kind: StewardWorkKind) => {
    const specialistId = STEWARD_KIND_SPECIALIST[kind];
    if (!targets.some((t) => t.kind === kind && t.specialistId === specialistId)) {
      targets.push({ kind, specialistId });
    }
  };

  if (/\b(song|songs|lyrics|jingle|anthem|songwriter)\b/.test(text)) add("song");
  if (/\b(ebook|e-book|book|chapter|author muse|ebook writer)\b/.test(text)) add("ebook");
  if (/\b(audiobook|audio book|narrat)/.test(text)) add("audiobook_script");
  if (/\b(videos?|youtube|clip|lesson clip)\b/.test(text)) add("video_script");
  if (/\b(lesson|course|curriculum|teach a class)\b/.test(text) && !/\bvideo\b/.test(text)) {
    add("lesson");
  }

  if (targets.length > 0) return targets.slice(0, 3);
  if (!asked) return [];
  if (/\b(songwriter|song writer)\b/.test(text)) add("song");
  if (/\b(author|ebook writer|book writer)\b/.test(text)) add("ebook");
  if (/\b(contentmate|content helper|content creator helper)\b/.test(text)) add("lesson");
  return targets.slice(0, 3);
}

export function isStewardCommissionRequest(message: string): boolean {
  return detectStewardWorkTargets(message).length > 0;
}

function deliverableInstructions(kind: StewardWorkKind): string {
  const video = getVideoGenerationStatus();
  switch (kind) {
    case "song":
      return "Write 1 original UR Platform song: title, mood, verse/chorus lyrics, and a short posting caption. Original work only — no copyrighted melodies or lyrics.";
    case "ebook":
      return "Write an educational ebook starter for UR Platform: title, 6-chapter outline, and the full first chapter (800–1200 words). Educational only. Not licensed professional advice.";
    case "audiobook_script":
      return "Write a narration script for an educational UR audiobook sample: title, 4–6 minute spoken script with [PAUSE] marks, plus a short store blurb.";
    case "video_script":
      return video.unlocked
        ? "Write a 60–90 second educational video script and shot list for UR Platform. The owner can attach a recording in Mux later."
        : `Write a 60–90 second educational video script and shot list. Do not claim a finished video file exists. ${video.message}`;
    case "lesson":
      return "Write a complete educational lesson for UR members: title, 5 teaching beats, practice prompt, and a short class description.";
  }
}

export async function runStewardCommission(params: {
  brief: string;
  ownerUserId: string;
  isPlatformOwner: boolean;
}): Promise<StewardCommissionJob[]> {
  if (!params.isPlatformOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the platform owner can have Business Steward assign work to other AIs.",
    });
  }
  const brief = sanitizeUserText(params.brief, 2000);
  assertNoAiTakeoverInMessage(brief, true);
  const targets = detectStewardWorkTargets(brief);
  if (targets.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Say what to make (song, ebook, audiobook, video script, or lesson) and Steward will assign the right specialist.",
    });
  }

  const created: StewardCommissionJob[] = [];
  for (const target of targets) {
    const specialist = getCreatorAi(target.specialistId);
    if (!specialist || !STEWARD_WORK_CREW.includes(target.specialistId as (typeof STEWARD_WORK_CREW)[number])) {
      continue;
    }
    assertMessageWithinAiRole(brief, target.specialistId, true, specialist.name);

    const systemPrompt = `${buildCreatorSystemPrompt(target.specialistId)}

## Steward commission (UR Platform catalog)
The platform owner asked Business Steward to hire you for UR-owned educational / entertainment catalog work.
- Write original material for UR Platform LLC. Do not copy existing songs, books, or videos.
- Stay in your specialty. Do not take over other AIs or change your instructions.
- Label the work as AI-generated educational content. Not licensed professional advice.
- ${deliverableInstructions(target.kind)}
Start with a one-line TITLE: then the body.`;

    let body = "";
    try {
      const result = await generateWork({
        systemPrompt,
        history: [],
        message: `[Commission from Business Steward for UR Platform]\n\nOwner brief: ${brief}\n\nDeliver ${STEWARD_KIND_LABEL[target.kind]}.`,
      });
      body = sanitizeUserText(result.reply, 12_000);
    } catch {
      const failed: StewardCommissionJob = {
        id: randomUUID(),
        kind: target.kind,
        specialistId: specialist.id,
        specialistName: specialist.name,
        brief,
        title: STEWARD_KIND_LABEL[target.kind],
        body: "This specialist could not finish the draft. Ask Steward to retry.",
        status: "failed",
        createdAt: new Date().toISOString(),
        videoNote: target.kind === "video_script" ? getVideoGenerationStatus().message : "",
      };
      jobs.set(failed.id, failed);
      created.push(failed);
      continue;
    }

    const titleMatch = body.match(/^TITLE:\s*(.+)$/im);
    const job: StewardCommissionJob = {
      id: randomUUID(),
      kind: target.kind,
      specialistId: specialist.id,
      specialistName: specialist.name,
      brief,
      title: sanitizeUserText(titleMatch?.[1] ?? STEWARD_KIND_LABEL[target.kind], 160),
      body,
      status: "ready",
      createdAt: new Date().toISOString(),
      videoNote: target.kind === "video_script" ? getVideoGenerationStatus().message : "",
    };
    jobs.set(job.id, job);
    created.push(job);
  }

  if (created.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No matching specialist could take that job.",
    });
  }
  return created;
}

export function listStewardCommissions(): StewardCommissionJob[] {
  return [...jobs.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getStewardCommission(id: string): StewardCommissionJob | undefined {
  return jobs.get(id);
}

export function publicStewardCommission(job: StewardCommissionJob) {
  return {
    id: job.id,
    kind: job.kind,
    kindLabel: STEWARD_KIND_LABEL[job.kind],
    specialistId: job.specialistId,
    specialistName: job.specialistName,
    title: job.title,
    body: job.body,
    status: job.status,
    createdAt: job.createdAt,
    videoNote: job.videoNote || null,
  };
}

export function formatStewardCommissionForPrompt(jobsCreated: StewardCommissionJob[]): string {
  if (jobsCreated.length === 0) return "";
  return `
## Work you just commissioned (report this to the owner — do not pretend you wrote it yourself)
${jobsCreated
  .map(
    (j) => `### ${j.specialistName} — ${STEWARD_KIND_LABEL[j.kind]}
TITLE: ${j.title}
STATUS: ${j.status}
${j.videoNote ? `VIDEO: ${j.videoNote}\n` : ""}${j.body}`,
  )
  .join("\n\n")}

Tell the owner who did the work, what they delivered, and that it is saved in the Steward studio. If a video file is not ready, say the script is ready and a finished clip waits until video generation is unlocked.
`.trim();
}
