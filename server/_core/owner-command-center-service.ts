/**
 * Private owner Command Center ledger — append-only English audit of AI hive + ops actions.
 * In-memory (same as incidents). Owner-only. Not a member or staff feed.
 */

import { randomUUID } from "crypto";
import { generateGoogleChatReply, isGoogleCloudAiConfigured } from "./google-ai";
import { getCreatorAi } from "./ai-creator-registry";
import { isOwnerOnlyPlatformAi } from "./platform-ops-ai";
import { OWNER_PLATFORM_OPS_CATALOG } from "../../lib/owner-platform-ops-catalog";
import { listPlatformSectionStates } from "./platform-section-flags-service";
import { getNamespaceCircuitStatus } from "./api-security";
import {
  loadOwnerCommandEventsFromDb,
  persistOwnerCommandEvent,
} from "../db-platform-ops";
import type {
  OwnerCommandEvent,
  OwnerCommandEventKind,
  OwnerCommandPendingRepair,
  OwnerCommandProtectionStat,
  OwnerCommandRoadmapNode,
  OwnerCommandSeverity,
} from "../../lib/owner-command-center-types";

const MAX_EVENTS = 2_000;

const events: OwnerCommandEvent[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

const NON_LATIN =
  /[\u0400-\u04FF\u0600-\u06FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\u0590-\u05FF]/;

export function looksNonEnglish(text: string): boolean {
  return NON_LATIN.test(text);
}

function clip(text: string, max = 480): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function aiName(creatorId: string): string {
  return getCreatorAi(creatorId)?.name ?? creatorId;
}

function clock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      timeZone: "America/Indiana/Indianapolis",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso.slice(11, 19);
  }
}

export async function toEnglishForOwner(text: string): Promise<{ english: string; translated: boolean }> {
  const excerpt = clip(text, 900);
  if (!excerpt) return { english: "(empty)", translated: false };
  if (!looksNonEnglish(excerpt)) return { english: excerpt, translated: false };
  if (!isGoogleCloudAiConfigured()) {
    return { english: `[Needs English translation] ${excerpt}`, translated: false };
  }
  try {
    const { reply } = await generateGoogleChatReply({
      systemPrompt:
        "Translate into clear plain English for the platform owner. Do not add advice, opinions, or extra facts. Output only the English translation.",
      history: [],
      message: excerpt,
      responseLanguage: "English",
      maxOutputTokens: 350,
      temperature: 0.1,
    });
    const english = clip(reply, 900);
    return { english: english || excerpt, translated: Boolean(english) };
  } catch {
    return { english: `[Translation unavailable] ${excerpt}`, translated: false };
  }
}

export function recordOwnerCommandEvent(input: {
  kind: OwnerCommandEventKind;
  severity?: OwnerCommandSeverity;
  sourceAiId: string;
  english: string;
  relatedAiIds?: string[];
  incidentId?: string;
  sectionId?: string;
  userId?: string;
  translated?: boolean;
  originalExcerpt?: string;
}): OwnerCommandEvent {
  const createdAt = new Date().toISOString();
  const relatedAiIds = [...new Set((input.relatedAiIds ?? []).filter((id) => id && id !== input.sourceAiId))];
  const sourceAiName = aiName(input.sourceAiId);
  const english = clip(input.english, 900);
  const kindTag = input.kind.replace(/_/g, " ").toUpperCase();
  const event: OwnerCommandEvent = {
    id: `occ-${randomUUID().slice(0, 12)}`,
    createdAt,
    kind: input.kind,
    severity: input.severity ?? "info",
    sourceAiId: input.sourceAiId,
    sourceAiName,
    english,
    terminalLine: `[${clock(createdAt)}] ${kindTag.padEnd(12)} ${sourceAiName} — ${clip(english, 160)}`,
    relatedAiIds,
    relatedAiNames: relatedAiIds.map(aiName),
    incidentId: input.incidentId,
    sectionId: input.sectionId,
    userIdSuffix: input.userId ? String(input.userId).slice(-6) : undefined,
    translated: input.translated === true,
    originalExcerpt: input.originalExcerpt ? clip(input.originalExcerpt, 280) : undefined,
  };
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
  void persistOwnerCommandEvent(event);
  return event;
}

export async function hydrateOwnerCommandCenter(): Promise<void> {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const rows = await loadOwnerCommandEventsFromDb(MAX_EVENTS);
      if (rows.length > 0 && events.length === 0) {
        events.push(...rows);
      } else if (rows.length > 0) {
        const seen = new Set(events.map((e) => e.id));
        for (const row of rows) {
          if (!seen.has(row.id)) events.push(row);
        }
        events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
      }
      hydrated = true;
    })();
  }
  await hydratePromise;
}

export function listOwnerCommandEvents(params?: {
  since?: string;
  limit?: number;
  kind?: OwnerCommandEventKind;
}): OwnerCommandEvent[] {
  const limit = Math.min(Math.max(params?.limit ?? 80, 1), 200);
  const sinceMs = params?.since ? Date.parse(params.since) : Number.NaN;
  return events
    .filter((e) => (params?.kind ? e.kind === params.kind : true))
    .filter((e) => !Number.isFinite(sinceMs) || Date.parse(e.createdAt) > sinceMs)
    .slice(0, limit);
}

function ensureCommandCenterBooted(): void {
  if (events.length > 0) return;
  recordOwnerCommandEvent({
    kind: "protection",
    severity: "info",
    sourceAiId: "platform-security-ai",
    english:
      "Command Center online. This private English log records hive talks, town halls, ops chats, health scans, sandbox repairs, and protection actions. Staff and members cannot see this feed. Events are saved to your MySQL database when it is running so they survive a server restart.",
  });
}

export function getOwnerCommandCenterSnapshot(pendingRepairs: OwnerCommandPendingRepair[] = []) {
  ensureCommandCenterBooted();
  const sectionStates = listPlatformSectionStates();
  const offline = sectionStates.filter((s) => !s.enabled);
  const keyNs = ["chat", "aiCreators", "platformOps", "webSearch"] as const;
  const openCircuits = keyNs.filter((ns) => getNamespaceCircuitStatus(ns).isOpen);
  const recent = listOwnerCommandEvents({ limit: 80 });
  const hiveTalk = recent.filter((e) => e.kind === "hive_consult" || e.kind === "town_hall").length;
  const incidents = recent.filter((e) => e.kind === "incident" || e.kind === "remediation").length;

  const protection: OwnerCommandProtectionStat[] = [
    {
      id: "sections",
      label: "Website / app sections",
      value: offline.length === 0 ? "All online" : `${offline.length} isolated`,
      tone: offline.length === 0 ? "ok" : "alert",
    },
    {
      id: "circuits",
      label: "API circuit breakers",
      value: openCircuits.length === 0 ? "Closed / healthy" : `${openCircuits.length} open`,
      tone: openCircuits.length === 0 ? "ok" : "watch",
    },
    {
      id: "hive",
      label: "AIs talking together",
      value: hiveTalk === 0 ? "Quiet" : `${hiveTalk} recent huddles`,
      tone: "ok",
    },
    {
      id: "incidents",
      label: "Protection actions",
      value: incidents === 0 ? "No new incidents in feed" : `${incidents} in the live log`,
      tone: incidents === 0 ? "ok" : "watch",
    },
  ];

  const busyIds = new Set(recent.slice(0, 12).map((e) => e.sourceAiId));
  const roadmap: OwnerCommandRoadmapNode[] = OWNER_PLATFORM_OPS_CATALOG.map((c) => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    role: c.mission,
    status: !isOwnerOnlyPlatformAi(c.id)
      ? "online"
      : busyIds.has(c.id)
        ? "busy"
        : offline.length > 0 && c.id === "platform-security-ai"
          ? "watch"
          : "online",
  }));

  return {
    generatedAt: new Date().toISOString(),
    ownerOnly: true as const,
    englishOnly: true as const,
    protection,
    roadmap,
    offlineSections: offline.map((s) => ({
      id: s.id,
      reason: s.reason ?? "Isolated pending your review",
    })),
    events: recent,
    terminalLines: recent.slice(0, 40).map((e) => e.terminalLine),
    pendingRepairs,
    durableSave: true as const,
    auditNote:
      "This feed is your private English audit of what UR AIs did. It is saved to MySQL when the database is running. It does not file taxes. Nothing is applied to the live website until you type I APPROVE.",
  };
}

export function _resetOwnerCommandCenterForTests(): void {
  events.length = 0;
  hydrated = false;
  hydratePromise = null;
}

export async function recordAiChatForOwnerCommandCenter(params: {
  creatorId: string;
  userId: string;
  userMessage: string;
  aiReply: string;
  hivePeers?: Array<{ id: string; name: string; insight?: string }>;
  incidentId?: string;
}): Promise<void> {
  const hivePeers = params.hivePeers ?? [];
  const isOps = isOwnerOnlyPlatformAi(params.creatorId);
  const kind = hivePeers.length > 0 ? "hive_consult" : isOps ? "ops_chat" : "specialist_chat";

  let english: string;
  let translated = false;
  let originalExcerpt: string | undefined;

  if (hivePeers.length > 0) {
    const digest = hivePeers
      .map((p) => `${p.name}: ${clip(p.insight ?? "", 180)}`)
      .join(" | ");
    const raw = `Hive huddle led by ${aiName(params.creatorId)}. Peers: ${hivePeers.map((p) => p.name).join(", ")}. ${digest}`;
    const converted = await toEnglishForOwner(raw);
    english = converted.english;
    translated = converted.translated;
    originalExcerpt = looksNonEnglish(raw) ? raw : undefined;
  } else if (isOps) {
    const raw = `${aiName(params.creatorId)} ops chat. Owner asked: ${clip(params.userMessage, 160)}. AI: ${clip(params.aiReply, 280)}`;
    const converted = await toEnglishForOwner(raw);
    english = converted.english;
    translated = converted.translated;
    originalExcerpt = looksNonEnglish(params.aiReply) ? params.aiReply : undefined;
  } else {
    english = `${aiName(params.creatorId)} answered a member. Question: ${clip(params.userMessage, 140)}. Reply: ${clip(params.aiReply, 200)}`;
    if (looksNonEnglish(`${params.userMessage} ${params.aiReply}`)) {
      const converted = await toEnglishForOwner(english);
      english = converted.english;
      translated = converted.translated;
      originalExcerpt = clip(`${params.userMessage} / ${params.aiReply}`, 280);
    }
  }

  recordOwnerCommandEvent({
    kind,
    severity: isOps ? "watch" : "info",
    sourceAiId: params.creatorId,
    english,
    relatedAiIds: hivePeers.map((p) => p.id),
    incidentId: params.incidentId,
    userId: params.userId,
    translated,
    originalExcerpt,
  });
}
