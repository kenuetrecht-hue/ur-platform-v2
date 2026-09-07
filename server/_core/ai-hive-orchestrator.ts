/**
 * Orchestrates hive capabilities into each AI chat turn:
 * memory, web search, peer context, domain dominance, post-chat learning.
 */

import {
  aiUserMemoryService,
  USER_SHARED_NOTEBOOK_CREATOR_ID,
} from "../../lib/ai-user-memory-service";
import {
  webSearchSecurityEngine,
  type SearchResult,
} from "../web-search-security";
import {
  assertAndConsumeWebSearch,
  tryConsumeCredit,
} from "./usage-credits-service";
import { VISION_UPLOAD_MESSAGE_UNITS } from "../../lib/usage-caps-catalog";
import {
  ensureUserMemoryHydrated,
  persistUserMemoryInteraction,
} from "./ai-user-memory-persistence";
import {
  getCreatorAi,
  listCreatorsForClient,
} from "./ai-creator-registry";
import { isOwnerOnlyPlatformAi } from "./platform-ops-ai";
import { detectStewardWorkTargets } from "./steward-commission-service";
import { BUSINESS_STEWARD_AI_ID } from "../../lib/steward-ad-budget";
import { assertAndConsumeStewardAdBudget } from "./steward-ad-budget-service";
import {
  findDominantSpecialistForMessage,
  getHiveCapabilities,
  getHivePeers,
  HIVE_OMNI_PROMPT,
  isComplexHiveProblem,
  scoreCreatorDomainMatch,
  shouldRunWebSearch,
  buildWebSearchQuery,
  buildJobsiteFieldPrompt,
} from "./ai-hive-capabilities";
import {
  generateGoogleChatReply,
  type GoogleChatTurn,
} from "./google-ai";

async function formatMemoryContext(userId: string, creatorId: string): Promise<string> {
  await ensureUserMemoryHydrated(userId, creatorId);
  await ensureUserMemoryHydrated(userId, USER_SHARED_NOTEBOOK_CREATOR_ID);
  const memory = aiUserMemoryService.getUserMemoryContext(userId, creatorId);
  const shopAssets = uniqueStrings([
    ...aiUserMemoryService.getRememberedShopAssets(userId, creatorId),
    ...aiUserMemoryService.getRememberedShopAssets(userId, USER_SHARED_NOTEBOOK_CREATOR_ID),
  ]);
  const learnerFacts = uniqueStrings([
    ...aiUserMemoryService.getRememberedLearnerFacts(userId, creatorId),
    ...aiUserMemoryService.getRememberedLearnerFacts(userId, USER_SHARED_NOTEBOOK_CREATOR_ID),
  ]);
  const projectFacts = uniqueStrings([
    ...aiUserMemoryService.getRememberedProjectFacts(userId, creatorId),
    ...aiUserMemoryService.getRememberedProjectFacts(userId, USER_SHARED_NOTEBOOK_CREATOR_ID),
  ]);
  const learnProgress = aiUserMemoryService.getLearningProgressTags(userId, creatorId);
  const hasDurableMemory =
    shopAssets.length > 0 ||
    learnerFacts.length > 0 ||
    learnProgress.length > 0 ||
    projectFacts.length > 0;
  if (memory.isNewSession && memory.conversationHistory.length === 0 && !hasDurableMemory) {
    return "";
  }

  const topics = memory.recentTopics.length
    ? memory.recentTopics.join(", ")
    : "none yet";
  const historyLines = memory.conversationHistory
    .slice(-6)
    .map(
      (e) =>
        `- User: ${e.userMessage.slice(0, 160)}… → You: ${e.aiResponse.slice(0, 160)}…`,
    )
    .join("\n");

  return `
## This member's memory (load every sign-in — do not restart as a stranger)
- Recent topics: ${topics}
- Preferred style: ${memory.preferredResponseStyle}
- Days since last session: ${memory.daysSinceLastSession}
${projectFacts.length ? `- This person's projects / standing notes: ${projectFacts.join("; ")}` : ""}
${shopAssets.length ? `- Remembered shop / jobsite / kitchen equipment: ${shopAssets.join("; ")}` : ""}
${learnerFacts.length ? `- Remembered learner facts (allergies, diet, skill): ${learnerFacts.join("; ")}` : ""}
${learnProgress.length ? `- Learn progress (continue here — do not restart from module 1): ${learnProgress.join("; ")}` : ""}
${historyLines ? `- Recent exchanges with you:\n${historyLines}` : ""}

Grounding: Only treat the lines above plus the current message as facts about this person. If a project, measurement, brand, or prior decision is not listed, say you do not have it — do not invent one.
`.trim();
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))].slice(0, 16);
}

export async function getUserMemoryPromptBlock(
  userId: string,
  creatorId: string,
): Promise<string> {
  return formatMemoryContext(userId, creatorId);
}

async function formatWebSearchContext(
  message: string,
  creatorId: string,
  userId: string,
  isPlatformOwner = false,
): Promise<{ context: string; results: SearchResult[] }> {
  assertAndConsumeWebSearch({ userId, creatorId, isPlatformOwner });
  assertAndConsumeStewardAdBudget({ creatorId, actions: ["search"] });

  const search = await webSearchSecurityEngine.performSearch(
    buildWebSearchQuery(message, creatorId),
    creatorId,
    userId,
    "general",
  );

  if (!search.success || search.results.length === 0) {
    return { context: "", results: [] };
  }

  const top = search.results.slice(0, 5);
  const snippets = top
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}** (${r.source})\n   ${r.description}\n   ${r.url}`,
    )
    .join("\n");

  return {
    results: top,
    context: `
## Web search results (use to supplement your knowledge — verify critical facts)
${snippets}
`.trim(),
  };
}

function formatHivePeerContext(creatorId: string): string {
  const peers = getHivePeers(creatorId);
  if (peers.length === 0) return "";

  const catalog = listCreatorsForClient({
    includeOwnerOps: isOwnerOnlyPlatformAi(creatorId),
  });
  const peerLines = peers
    .map((id) => catalog.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => `- **${c!.name}** (${c!.id}): ${c!.mission}`)
    .join("\n");

  if (!peerLines) return "";

  return `
## Hive peers (refer when out-of-domain; collaborate on multi-phase projects)
${peerLines}
`.trim();
}

function formatDomainDominance(creatorId: string, defName: string): string {
  return `
## Domain dominance
You are **${defName}** — the dominant UR hive specialist for your category.
Speak as the in-domain authority; defer to hive peers for their domains.
`.trim();
}

function formatOffDomainHint(creatorId: string, message: string): string {
  if (isOwnerOnlyPlatformAi(creatorId)) return "";
  const better = findDominantSpecialistForMessage(message, creatorId);
  if (!better || better.score < 2) return "";

  const specialist = getCreatorAi(better.creatorId);
  if (!specialist) return "";

  return `
## Domain routing hint
This message may fit **${specialist.name}** (${specialist.id}) better (match score ${better.score}).
If clearly outside your scope, recommend them in AI Hub and offer to help with your specialty only.
`.trim();
}

export async function buildHiveEnhancedSystemPrompt(params: {
  creatorId: string;
  userId: string;
  message: string;
  basePrompt: string;
  isPlatformOwner?: boolean;
}): Promise<{ systemPrompt: string; searchResults: SearchResult[] }> {
  const def = getCreatorAi(params.creatorId);
  if (!def) return { systemPrompt: params.basePrompt, searchResults: [] };

  const caps = getHiveCapabilities(params.creatorId);
  const blocks: string[] = [
    params.basePrompt,
    HIVE_OMNI_PROMPT,
    formatDomainDominance(params.creatorId, def.name),
  ];
  let searchResults: SearchResult[] = [];

  if (caps.longTermMemory) {
    const mem = await formatMemoryContext(params.userId, params.creatorId);
    if (mem) blocks.push(mem);
  }

  if (caps.hiveCollaboration) {
    const peers = formatHivePeerContext(params.creatorId);
    if (peers) blocks.push(peers);
  }

  if (caps.crossSpecialistReferral) {
    const hint = formatOffDomainHint(params.creatorId, params.message);
    if (hint) blocks.push(hint);
  }

  const fieldPrompt = buildJobsiteFieldPrompt(params.creatorId);
  if (fieldPrompt) blocks.push(fieldPrompt);

  if (shouldRunWebSearch(params.message, caps, params.creatorId)) {
    const search = await formatWebSearchContext(
      params.message,
      params.creatorId,
      params.userId,
      params.isPlatformOwner,
    );
    if (search.context) blocks.push(search.context);
    searchResults = search.results;
  }

  if (caps.troubleshooting) {
    blocks.push(`
## Troubleshooting mode
When the user reports a problem: (1) clarify symptoms, (2) list likely causes ranked by probability,
(3) safe diagnostic steps, (4) repair options, (5) when to stop DIY and call a licensed professional.
`.trim());
  }

  return { systemPrompt: blocks.join("\n\n"), searchResults };
}

export function recordHiveInteraction(params: {
  userId: string;
  creatorId: string;
  userMessage: string;
  aiReply: string;
}): void {
  aiUserMemoryService.initializeUser(params.userId, params.creatorId, "User");
  aiUserMemoryService.recordConversation(
    params.userId,
    params.creatorId,
    params.userMessage,
    params.aiReply,
  );
  aiUserMemoryService.rememberShopAssetsFromMessage(
    params.userId,
    params.creatorId,
    params.userMessage,
  );
  aiUserMemoryService.rememberLearnerFactsFromMessage(
    params.userId,
    params.creatorId,
    params.userMessage,
  );
  aiUserMemoryService.rememberProjectFactsFromMessage(
    params.userId,
    params.creatorId,
    params.userMessage,
  );
  aiUserMemoryService.initializeUser(params.userId, USER_SHARED_NOTEBOOK_CREATOR_ID, "User");
  aiUserMemoryService.rememberShopAssetsFromMessage(
    params.userId,
    USER_SHARED_NOTEBOOK_CREATOR_ID,
    params.userMessage,
  );
  aiUserMemoryService.rememberLearnerFactsFromMessage(
    params.userId,
    USER_SHARED_NOTEBOOK_CREATOR_ID,
    params.userMessage,
  );
  aiUserMemoryService.rememberProjectFactsFromMessage(
    params.userId,
    USER_SHARED_NOTEBOOK_CREATOR_ID,
    params.userMessage,
  );
  void persistUserMemoryInteraction(params);
  void persistUserMemoryInteraction({
    userId: params.userId,
    creatorId: USER_SHARED_NOTEBOOK_CREATOR_ID,
    userMessage: params.userMessage,
    aiReply: params.aiReply,
  });
}

function pickHivePeerIds(creatorId: string, message: string): string[] {
  const peers = getHivePeers(creatorId);
  if (creatorId === BUSINESS_STEWARD_AI_ID) {
    const commissioned = detectStewardWorkTargets(message).map((t) => t.specialistId);
    if (commissioned.length > 0) return [...new Set(commissioned)].slice(0, 3);
    const ranked = peers
      .map((id) => ({ id, score: scoreCreatorDomainMatch(id, message) }))
      .filter((row) => row.score > 0 && row.id !== "contentmate")
      .sort((a, b) => b.score - a.score)
      .map((row) => row.id);
    const fallback = peers.filter((id) => id !== "contentmate");
    return (ranked.length > 0 ? ranked : fallback).slice(0, 3);
  }
  return peers.slice(0, 3);
}

/** Multi-AI hive consultation — primary specialist synthesizes peer insights. */
export async function runHiveConsultation(params: {
  creatorId: string;
  message: string;
  userId: string;
  history?: GoogleChatTurn[];
  attachments?: Array<{ mimeType: string; base64: string }>;
  responseLanguage?: string;
}): Promise<{
  reply: string;
  model: string;
  consultedPeers: Array<{ id: string; name: string; insight: string }>;
  searchResults: SearchResult[];
}> {
  const def = getCreatorAi(params.creatorId);
  if (!def) {
    throw new Error("Unknown creator");
  }

  const caps = getHiveCapabilities(params.creatorId);
  const peerIds = caps.hiveCollaboration ? pickHivePeerIds(params.creatorId, params.message) : [];
  const consultedPeers: Array<{ id: string; name: string; insight: string }> = [];

  for (const peerId of peerIds) {
    const peer = getCreatorAi(peerId);
    if (!peer) continue;

    const peerPromptResult = await buildHiveEnhancedSystemPrompt({
      creatorId: peerId,
      userId: params.userId,
      message: params.message,
      basePrompt: `You are ${peer.name}. Give a brief expert opinion (3-5 sentences) on this problem from YOUR domain only.`,
    });

    const { reply: insight } = await generateGoogleChatReply({
      systemPrompt: peerPromptResult.systemPrompt,
      history: [],
      message: `[Hive consultation request from ${def.name}]\n\nProblem: ${params.message}\n\nProvide your domain-specific insight only.`,
      responseLanguage: params.responseLanguage,
    });

    consultedPeers.push({ id: peerId, name: peer.name, insight });
  }

  const synthesisBlock = consultedPeers.length
    ? `\n## Hive peer insights (synthesize — you are lead specialist)\n${consultedPeers
        .map((p) => `### ${p.name}\n${p.insight}`)
        .join("\n\n")}`
    : "";

  const basePromptResult = await buildHiveEnhancedSystemPrompt({
    creatorId: params.creatorId,
    userId: params.userId,
    message: params.message,
    basePrompt: `You are ${def.name}, lead specialist. Synthesize hive input into one cohesive answer.`,
  });

  const { reply, model } = await generateGoogleChatReply({
    systemPrompt: basePromptResult.systemPrompt + synthesisBlock,
    history: params.history ?? [],
    message: params.message,
    attachments: params.attachments?.length ? params.attachments : undefined,
    responseLanguage: params.responseLanguage,
  });

  return {
    reply,
    model,
    consultedPeers,
    searchResults: basePromptResult.searchResults,
  };
}

export function getCreatorHiveProfile(creatorId: string) {
  const def = getCreatorAi(creatorId);
  if (!def) return null;

  const caps = getHiveCapabilities(creatorId);
  const peers = getHivePeers(creatorId)
    .filter((id) => isOwnerOnlyPlatformAi(creatorId) || !isOwnerOnlyPlatformAi(id))
    .map((id) => getCreatorAi(id))
    .filter(Boolean)
    .map((p) => ({ id: p!.id, name: p!.name, avatar: p!.avatar }));

  return {
    creatorId,
    name: def.name,
    capabilities: caps,
    hivePeers: peers,
    supportsHiveConsult: caps.hiveCollaboration && peers.length > 0,
  };
}

export { isComplexHiveProblem, scoreCreatorDomainMatch };
