/**
 * Hive Town Hall — schedule a multi-specialist session and broadcast questions to a panel.
 * Owner / dev users get unlimited access; others require ai_hive entitlement.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  buildCreatorSystemPrompt,
  getCreatorAi,
  isCreatorAiId,
  listCreatorsForClient,
} from "./ai-creator-registry";
import { scoreCreatorDomainMatch } from "./ai-hive-capabilities";
import { buildHiveEnhancedSystemPrompt } from "./ai-hive-orchestrator";
import { generateGoogleChatReply, isGoogleCloudAiConfigured } from "./google-ai";
import { sanitizeUserText } from "./input-sanitize";
import { mapServiceErrorToTrpc } from "./service-errors";
import { isOwnerOnlyPlatformAi } from "./platform-ops-ai";
import { isAffiliateOnlyAi } from "./affiliate-associate-ai";
import { recordOwnerCommandEvent, toEnglishForOwner } from "./owner-command-center-service";

export type TownHallPanelMode = "all_categories" | "category" | "recommended" | "custom";

export type TownHallStatus = "scheduled" | "live" | "ended";

export type TownHallSession = {
  id: string;
  hostUserId: string;
  title: string;
  scheduledAt: string;
  panelMode: TownHallPanelMode;
  category?: string;
  specialistIds: string[];
  status: TownHallStatus;
  createdAt: string;
};

export type TownHallSpecialistReply = {
  creatorId: string;
  name: string;
  avatar: string;
  category: string;
  reply: string;
};

export type TownHallTurn = {
  id: string;
  sessionId: string;
  userMessage: string;
  replies: TownHallSpecialistReply[];
  synthesis?: string;
  model?: string;
  createdAt: string;
};

const MAX_PANEL_SIZE = 24;
const MAX_TURNS_PER_SESSION = 40;

const sessions = new Map<string, TownHallSession>();
const turns = new Map<string, TownHallTurn[]>();

function normalizeStatus(session: TownHallSession): TownHallStatus {
  if (session.status === "ended") return "ended";
  const start = Date.parse(session.scheduledAt);
  if (Date.now() >= start - 60_000) return "live";
  return "scheduled";
}

function publicSpecialists() {
  return listCreatorsForClient({ includeOwnerOps: false }).filter(
    (c) => !c.ownerOnly && !isAffiliateOnlyAi(c.id),
  );
}

/** Build specialist panel for a town hall session. */
export function buildTownHallPanel(params: {
  mode: TownHallPanelMode;
  message?: string;
  category?: string;
  specialistIds?: string[];
  maxPanelSize?: number;
}): string[] {
  const max = Math.min(params.maxPanelSize ?? MAX_PANEL_SIZE, MAX_PANEL_SIZE);
  const all = publicSpecialists();

  if (params.mode === "custom" && params.specialistIds?.length) {
    return params.specialistIds
      .filter((id) => isCreatorAiId(id) && !isOwnerOnlyPlatformAi(id) && !isAffiliateOnlyAi(id))
      .slice(0, max);
  }

  if (params.mode === "category" && params.category) {
    return all.filter((c) => c.category === params.category).map((c) => c.id).slice(0, max);
  }

  if (params.mode === "recommended" && params.message) {
    const scored = all
      .map((c) => ({ id: c.id, score: scoreCreatorDomainMatch(c.id, params.message!) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length >= 1) {
      return scored.slice(0, max).map((s) => s.id);
    }
  }

  // all_categories — one lead specialist per category (closest to "everyone")
  const byCategory = new Map<string, string>();
  for (const c of all) {
    if (!byCategory.has(c.category)) {
      byCategory.set(c.category, c.id);
    }
  }
  return [...byCategory.values()].slice(0, max);
}

export function scheduleTownHallSession(params: {
  hostUserId: string;
  title: string;
  scheduledAt: string;
  panelMode: TownHallPanelMode;
  category?: string;
  specialistIds?: string[];
  seedMessage?: string;
}): TownHallSession {
  const title = sanitizeUserText(params.title, 120) || "Hive Town Hall";
  const scheduledAt = params.scheduledAt;
  if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid scheduled time required." });
  }

  const panelIds = buildTownHallPanel({
    mode: params.panelMode,
    category: params.category,
    specialistIds: params.specialistIds,
    message: params.seedMessage,
  });

  if (panelIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Could not build a specialist panel. Pick a category or custom specialists.",
    });
  }

  const session: TownHallSession = {
    id: randomUUID(),
    hostUserId: params.hostUserId,
    title,
    scheduledAt,
    panelMode: params.panelMode,
    category: params.category,
    specialistIds: panelIds,
    status: normalizeStatus({
      id: "",
      hostUserId: params.hostUserId,
      title,
      scheduledAt,
      panelMode: params.panelMode,
      specialistIds: panelIds,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    }),
    createdAt: new Date().toISOString(),
  };

  sessions.set(session.id, session);
  turns.set(session.id, []);
  return session;
}

export function listTownHallSessions(hostUserId: string): TownHallSession[] {
  return [...sessions.values()]
    .filter((s) => s.hostUserId === hostUserId)
    .map((s) => ({ ...s, status: normalizeStatus(s) }))
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));
}

export function getTownHallSession(sessionId: string, hostUserId?: string): TownHallSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (hostUserId && session.hostUserId !== hostUserId) return null;
  return { ...session, status: normalizeStatus(session) };
}

export function getTownHallTurns(sessionId: string): TownHallTurn[] {
  return turns.get(sessionId) ?? [];
}

export function endTownHallSession(sessionId: string, hostUserId: string): TownHallSession {
  const session = getTownHallSession(sessionId, hostUserId);
  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Town hall session not found." });
  }
  const ended = { ...session, status: "ended" as const };
  sessions.set(sessionId, ended);
  return ended;
}

async function askSpecialist(params: {
  creatorId: string;
  userId: string;
  userMessage: string;
  townHallTitle: string;
}): Promise<TownHallSpecialistReply> {
  const def = getCreatorAi(params.creatorId);
  if (!def) {
    throw new Error(`Unknown specialist: ${params.creatorId}`);
  }

  const basePrompt = buildCreatorSystemPrompt(params.creatorId);
  const promptResult = await buildHiveEnhancedSystemPrompt({
    creatorId: params.creatorId,
    userId: params.userId,
    message: params.userMessage,
    basePrompt:
      basePrompt +
      `\n\n## Town Hall mode\nYou are in a **Hive Town Hall** ("${params.townHallTitle}"). ` +
      `Give a concise expert answer (3–6 sentences). Other specialists are also responding — stay in your domain.`,
  });

  const { reply } = await generateGoogleChatReply({
    systemPrompt: promptResult.systemPrompt,
    history: [],
    message: params.userMessage,
  });

  return {
    creatorId: def.id,
    name: def.name,
    avatar: def.avatar,
    category: def.category,
    reply,
  };
}

async function synthesizeTownHall(params: {
  leadCreatorId: string;
  userId: string;
  userMessage: string;
  replies: TownHallSpecialistReply[];
  townHallTitle: string;
}): Promise<{ synthesis: string; model: string }> {
  const lead = getCreatorAi(params.leadCreatorId) ?? getCreatorAi(params.replies[0]?.creatorId ?? "");
  if (!lead) {
    return {
      synthesis: params.replies.map((r) => `**${r.name}:** ${r.reply}`).join("\n\n"),
      model: "panel-only",
    };
  }

  const panelBlock = params.replies
    .map((r) => `### ${r.name} (${r.category})\n${r.reply}`)
    .join("\n\n");

  const systemPrompt = `You are ${lead.name}, moderating a Hive Town Hall ("${params.townHallTitle}").
Synthesize the panel responses into one cohesive answer for the user. Credit specialists by name where helpful.
Keep it practical and under 12 sentences.`;

  const { reply, model } = await generateGoogleChatReply({
    systemPrompt,
    history: [],
    message: `User question: ${params.userMessage}\n\nPanel responses:\n${panelBlock}`,
  });

  return { synthesis: reply, model };
}

export async function sendTownHallMessage(params: {
  sessionId: string;
  hostUserId: string;
  message: string;
}): Promise<TownHallTurn> {
  if (!isGoogleCloudAiConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "AI is not configured on the server. Add CONTENTMATE_GEMINI_API_KEY to .env.",
    });
  }

  const session = getTownHallSession(params.sessionId, params.hostUserId);
  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Town hall session not found." });
  }

  const status = normalizeStatus(session);
  if (status === "ended") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This town hall has ended." });
  }
  if (status === "scheduled") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Town hall starts ${new Date(session.scheduledAt).toLocaleString()}. Wait until go-live or schedule for now.`,
    });
  }

  const existing = turns.get(params.sessionId) ?? [];
  if (existing.length >= MAX_TURNS_PER_SESSION) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This town hall reached the message limit. Start a new session.",
    });
  }

  const userMessage = sanitizeUserText(params.message, 2000);
  if (!userMessage) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Message cannot be empty." });
  }

  try {
    const replyResults = await Promise.all(
      session.specialistIds.map((creatorId) =>
        askSpecialist({
          creatorId,
          userId: params.hostUserId,
          userMessage,
          townHallTitle: session.title,
        }),
      ),
    );

    const leadId = session.specialistIds[0]!;
    const { synthesis, model } = await synthesizeTownHall({
      leadCreatorId: leadId,
      userId: params.hostUserId,
      userMessage,
      replies: replyResults,
      townHallTitle: session.title,
    });

    const turn: TownHallTurn = {
      id: randomUUID(),
      sessionId: params.sessionId,
      userMessage,
      replies: replyResults,
      synthesis,
      model,
      createdAt: new Date().toISOString(),
    };

    turns.set(params.sessionId, [...existing, turn]);

    if (status === "scheduled") {
      sessions.set(params.sessionId, { ...session, status: "live" });
    }

    const digest = `Town Hall "${session.title}". Question: ${userMessage}. Panel: ${replyResults
      .map((r) => `${r.name}: ${r.reply}`)
      .join(" | ")}. Synthesis: ${synthesis}`;
    void toEnglishForOwner(digest)
      .then((converted) =>
        recordOwnerCommandEvent({
          kind: "town_hall",
          severity: "watch",
          sourceAiId: leadId,
          english: converted.english,
          relatedAiIds: replyResults.map((r) => r.creatorId),
          userId: params.hostUserId,
          translated: converted.translated,
          originalExcerpt: userMessage,
        }),
      )
      .catch(() => undefined);

    return turn;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    mapServiceErrorToTrpc(error);
  }
}

export function getTownHallPanelPreview(params: {
  mode: TownHallPanelMode;
  category?: string;
  specialistIds?: string[];
  seedMessage?: string;
}): Array<{ id: string; name: string; avatar: string; category: string }> {
  const ids = buildTownHallPanel({
    mode: params.mode,
    category: params.category,
    specialistIds: params.specialistIds,
    message: params.seedMessage,
  });
  return ids
    .map((id) => getCreatorAi(id))
    .filter(Boolean)
    .map((c) => ({
      id: c!.id,
      name: c!.name,
      avatar: c!.avatar,
      category: c!.category,
    }));
}

export function _clearTownHallForTests(): void {
  sessions.clear();
  turns.clear();
}
