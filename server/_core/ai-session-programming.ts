/**
 * Per-AI live session programming — content creators host paid classes with committed duration.
 */

import { TRPCError } from "@trpc/server";
import { getCreatorAi, ALL_CREATOR_AI_IDS } from "./ai-creator-registry";
import { isOwnerOnlyPlatformAi } from "./platform-ops-ai";

/** Content creator floor: $0.20 per minute — they may charge more. */
export const CREATOR_MIN_PRICE_CENTS_PER_MINUTE = 20;

/** @deprecated Use CREATOR_MIN_PRICE_CENTS_PER_MINUTE */
export const MIN_PRICE_CENTS_PER_MINUTE = CREATOR_MIN_PRICE_CENTS_PER_MINUTE;

/** Allowed class lengths — creators pick one; must stay for the full committed time. */
export const ALLOWED_SESSION_DURATIONS = [15, 30, 45, 60] as const;
export type AllowedSessionDuration = (typeof ALLOWED_SESSION_DURATIONS)[number];

/** Zoom-scale webinar capacity — up to 10,000 joiners per session. */
export const MAX_SESSION_ATTENDEES = 10_000;

export const SESSION_CAPACITY_PRESETS = [500, 1_000, 5_000, 10_000] as const;

export type AiSessionProgram = {
  creatorAiId: string;
  creatorName: string;
  enabled: boolean;
  /** Committed class length — must be 15, 30, 45, or 60 minutes. */
  durationMinutes: AllowedSessionDuration;
  priceCentsPerMinute: number;
  maxAttendees: number;
  /** Creator may extend past committed duration when true (default on). */
  allowOvertime: boolean;
  defaultTitle: string;
  hostScript: string;
  sessionDescription: string;
  updatedAt: string;
};

const DEFAULT_DURATION: AllowedSessionDuration = 60;
const DEFAULT_PRICE_CENTS_PER_MINUTE = CREATOR_MIN_PRICE_CENTS_PER_MINUTE;
const DEFAULT_MAX = 5_000;

const programStore = new Map<string, Omit<AiSessionProgram, "creatorName">>();

export function isAllowedSessionDuration(minutes: number): minutes is AllowedSessionDuration {
  return (ALLOWED_SESSION_DURATIONS as readonly number[]).includes(minutes);
}

export function assertAllowedSessionDuration(minutes: number): AllowedSessionDuration {
  if (!isAllowedSessionDuration(minutes)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Class length must be 15, 30, 45, or 60 minutes.",
    });
  }
  return minutes;
}

export function durationLabel(minutes: AllowedSessionDuration): string {
  if (minutes === 15) return "15 minutes";
  if (minutes === 30) return "30 minutes (half hour)";
  if (minutes === 45) return "45 minutes";
  return "60 minutes (1 hour)";
}

export function computeSessionTicketCents(
  durationMinutes: number,
  priceCentsPerMinute: number,
): number {
  const minutes = assertAllowedSessionDuration(durationMinutes);
  const rate = Math.max(CREATOR_MIN_PRICE_CENTS_PER_MINUTE, Math.round(priceCentsPerMinute));
  return minutes * rate;
}

export function clampSessionCapacity(maxAttendees: number): number {
  return Math.min(MAX_SESSION_ATTENDEES, Math.max(1, maxAttendees));
}

export function clampPriceCentsPerMinute(priceCentsPerMinute: number): number {
  return Math.max(CREATOR_MIN_PRICE_CENTS_PER_MINUTE, Math.round(priceCentsPerMinute));
}

function defaultHostScript(creatorName: string, category: string, duration: AllowedSessionDuration): string {
  return [
    `You are ${creatorName}, hosting a live paid class on UR Platform.`,
    `Category: ${category}.`,
    `COMMITMENT: You promised ${durationLabel(duration)}. You MUST remain live and engaged for the entire ${duration} minutes — do not wrap up early.`,
    "After the committed time you may continue if overtime is allowed, but never end before then.",
    "Run a structured session:",
    "1. Welcome attendees and confirm the committed duration (2–3 min)",
    "2. Deliver core teaching with examples (majority of time)",
    "3. Live Q&A",
    "4. Only after the full committed duration: wrap up or continue into bonus overtime",
    "Stay in character. Encourage engagement. Speak to the whole room (thousands may attend).",
  ].join("\n");
}

function buildDefault(creatorAiId: string): AiSessionProgram {
  const creator = getCreatorAi(creatorAiId);
  if (!creator) {
    throw new TRPCError({ code: "NOT_FOUND", message: "AI specialist not found." });
  }
  return {
    creatorAiId,
    creatorName: creator.name,
    enabled: false,
    durationMinutes: DEFAULT_DURATION,
    priceCentsPerMinute: DEFAULT_PRICE_CENTS_PER_MINUTE,
    maxAttendees: DEFAULT_MAX,
    allowOvertime: true,
    defaultTitle: `Live with ${creator.name} — 1 Hour Class`,
    hostScript: defaultHostScript(creator.name, creator.category, DEFAULT_DURATION),
    sessionDescription: `Join ${creator.name} for a committed ${durationLabel(DEFAULT_DURATION)} class. ${creator.mission}`,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeStoredProgram(
  stored: Omit<AiSessionProgram, "creatorName"> & {
    priceCents?: number;
    durationMinutes?: number;
    allowOvertime?: boolean;
  },
): Omit<AiSessionProgram, "creatorName"> {
  const rawDuration = stored.durationMinutes ?? DEFAULT_DURATION;
  const durationMinutes = isAllowedSessionDuration(rawDuration) ? rawDuration : DEFAULT_DURATION;
  const priceCentsPerMinute =
    stored.priceCentsPerMinute != null
      ? clampPriceCentsPerMinute(stored.priceCentsPerMinute)
      : stored.priceCents != null
        ? clampPriceCentsPerMinute(Math.round(stored.priceCents / durationMinutes))
        : DEFAULT_PRICE_CENTS_PER_MINUTE;

  return {
    creatorAiId: stored.creatorAiId,
    enabled: stored.enabled,
    durationMinutes,
    priceCentsPerMinute,
    maxAttendees: clampSessionCapacity(stored.maxAttendees),
    allowOvertime: stored.allowOvertime ?? true,
    defaultTitle: stored.defaultTitle,
    hostScript: stored.hostScript,
    sessionDescription: stored.sessionDescription,
    updatedAt: stored.updatedAt,
  };
}

export function getAiSessionProgram(creatorAiId: string): AiSessionProgram {
  const stored = programStore.get(creatorAiId);
  const creator = getCreatorAi(creatorAiId);
  if (!creator) {
    throw new TRPCError({ code: "NOT_FOUND", message: "AI specialist not found." });
  }
  if (!stored) return buildDefault(creatorAiId);
  return { ...normalizeStoredProgram(stored), creatorName: creator.name };
}

export function listAiSessionPrograms(opts?: { enabledOnly?: boolean }): AiSessionProgram[] {
  const ids = ALL_CREATOR_AI_IDS.filter((id) => !isOwnerOnlyPlatformAi(id));
  const programs = ids.map((id) => getAiSessionProgram(id));
  if (opts?.enabledOnly) return programs.filter((p) => p.enabled);
  return programs.sort((a, b) => a.creatorName.localeCompare(b.creatorName));
}

export function setAiSessionProgram(params: {
  creatorAiId: string;
  enabled?: boolean;
  durationMinutes?: number;
  priceCentsPerMinute?: number;
  maxAttendees?: number;
  allowOvertime?: boolean;
  defaultTitle?: string;
  hostScript?: string;
  sessionDescription?: string;
}): AiSessionProgram {
  if (isOwnerOnlyPlatformAi(params.creatorAiId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Owner ops AIs cannot host public paid sessions.",
    });
  }
  const current = getAiSessionProgram(params.creatorAiId);

  if (
    params.priceCentsPerMinute != null &&
    params.priceCentsPerMinute < CREATOR_MIN_PRICE_CENTS_PER_MINUTE
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `$0.20 per minute is the floor price — you cannot go lower than twenty cents per minute.`,
    });
  }

  const durationMinutes =
    params.durationMinutes != null
      ? assertAllowedSessionDuration(params.durationMinutes)
      : current.durationMinutes;

  const next: Omit<AiSessionProgram, "creatorName"> = {
    creatorAiId: params.creatorAiId,
    enabled: params.enabled ?? current.enabled,
    durationMinutes,
    priceCentsPerMinute: clampPriceCentsPerMinute(
      params.priceCentsPerMinute ?? current.priceCentsPerMinute,
    ),
    maxAttendees: clampSessionCapacity(params.maxAttendees ?? current.maxAttendees),
    allowOvertime: params.allowOvertime ?? current.allowOvertime,
    defaultTitle: (params.defaultTitle ?? current.defaultTitle).slice(0, 200),
    hostScript: (params.hostScript ?? current.hostScript).slice(0, 8000),
    sessionDescription: (params.sessionDescription ?? current.sessionDescription).slice(0, 2000),
    updatedAt: new Date().toISOString(),
  };
  programStore.set(params.creatorAiId, next);
  return getAiSessionProgram(params.creatorAiId);
}

export function buildSessionHostSystemPrompt(
  creatorAiId: string,
  sessionTitle: string,
  committedDurationMinutes?: AllowedSessionDuration,
): string {
  const program = getAiSessionProgram(creatorAiId);
  const creator = getCreatorAi(creatorAiId);
  const committed = committedDurationMinutes ?? program.durationMinutes;
  const ticketCents = computeSessionTicketCents(committed, program.priceCentsPerMinute);
  return [
    program.hostScript,
    "",
    `Session title: ${sessionTitle}`,
    `COMMITTED DURATION: ${durationLabel(committed)} — you must stay live for all ${committed} minutes.`,
    program.allowOvertime
      ? "Overtime is allowed after the committed duration if you choose to continue."
      : "No overtime — end promptly after the committed duration.",
    `Room capacity: up to ${program.maxAttendees.toLocaleString()} attendees`,
    `Ticket: $${(ticketCents / 100).toFixed(2)} ($${(program.priceCentsPerMinute / 100).toFixed(2)}/min)`,
    creator ? `Mission: ${creator.mission}` : "",
    "You are in LIVE CLASS HOST mode. Honor the full committed duration.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getSessionCommitmentSummary(params: {
  startsAt: string;
  committedDurationMinutes: AllowedSessionDuration;
  overtimeMinutes: number;
  allowOvertime: boolean;
}) {
  const start = Date.parse(params.startsAt);
  const committedEndsAt = start + params.committedDurationMinutes * 60_000;
  const actualEndsAt = committedEndsAt + params.overtimeMinutes * 60_000;
  const now = Date.now();
  const committedRemainingMs = Math.max(0, committedEndsAt - now);
  const fulfilled = now >= committedEndsAt;

  return {
    committedDurationMinutes: params.committedDurationMinutes,
    committedDurationLabel: durationLabel(params.committedDurationMinutes),
    committedEndsAt: new Date(committedEndsAt).toISOString(),
    actualEndsAt: new Date(actualEndsAt).toISOString(),
    overtimeMinutes: params.overtimeMinutes,
    allowOvertime: params.allowOvertime,
    commitmentFulfilled: fulfilled,
    committedMinutesRemaining: Math.ceil(committedRemainingMs / 60_000),
    mustStayUntilMessage: fulfilled
      ? "Committed duration fulfilled."
      : `Host must stay live for the full ${params.committedDurationMinutes} minutes (through ${new Date(committedEndsAt).toLocaleTimeString()}).`,
  };
}
