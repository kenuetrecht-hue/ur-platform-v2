/**
 * Orchestrates hive capabilities into each AI chat turn:
 * memory, web search, peer context, domain dominance, post-chat learning.
 */

import { aiUserMemoryService } from "../../lib/ai-user-memory-service";
import { webSearchSecurityEngine } from "../web-search-security";
import {
  getCreatorAi,
  listCreatorsForClient,
} from "./ai-creator-registry";
import {
  findDominantSpecialistForMessage,
  getHiveCapabilities,
  getHivePeers,
  HIVE_OMNI_PROMPT,
  isComplexHiveProblem,
  scoreCreatorDomainMatch,
  shouldRunWebSearch,
} from "./ai-hive-capabilities";
import {
  generateGoogleChatReply,
  type GoogleChatTurn,
} from "./google-ai";

function formatMemoryContext(userId: string, creatorId: string): string {
  const memory = aiUserMemoryService.getUserMemoryContext(userId, creatorId);
  if (memory.isNewSession && memory.conversationHistory.length === 0) {
    return "";
  }

  const topics = memory.recentTopics.length
    ? memory.recentTopics.join(", ")
    : "none yet";
  const historyLines = memory.conversationHistory
    .slice(-3)
    .map(
      (e) =>
        `- User: ${e.userMessage.slice(0, 120)}… → You: ${e.aiResponse.slice(0, 120)}…`,
    )
    .join("\n");

  return `
## User memory context (long-term — use naturally)
- Recent topics: ${topics}
- Preferred style: ${memory.preferredResponseStyle}
- User mood (inferred): ${memory.userMood}
- Days since last session: ${memory.daysSinceLastSession}
${historyLines ? `- Recent exchanges:\n${historyLines}` : ""}
`.trim();
}

async function formatWebSearchContext(
  message: string,
  creatorId: string,
  userId: string,
): Promise<string> {
  const search = await webSearchSecurityEngine.performSearch(
    message.slice(0, 200),
    creatorId,
    userId,
    "general",
  );

  if (!search.success || search.results.length === 0) {
    return "";
  }

  const snippets = search.results
    .slice(0, 5)
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}** (${r.source})\n   ${r.description}\n   ${r.url}`,
    )
    .join("\n");

  return `
## Web search results (use to supplement your knowledge — verify critical facts)
${snippets}
`.trim();
}

function formatHivePeerContext(creatorId: string): string {
  const peers = getHivePeers(creatorId);
  if (peers.length === 0) return "";

  const catalog = listCreatorsForClient();
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
}): Promise<string> {
  const def = getCreatorAi(params.creatorId);
  if (!def) return params.basePrompt;

  const caps = getHiveCapabilities(params.creatorId);
  const blocks: string[] = [
    params.basePrompt,
    HIVE_OMNI_PROMPT,
    formatDomainDominance(params.creatorId, def.name),
  ];

  if (caps.longTermMemory) {
    const mem = formatMemoryContext(params.userId, params.creatorId);
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

  if (shouldRunWebSearch(params.message, caps)) {
    const search = await formatWebSearchContext(
      params.message,
      params.creatorId,
      params.userId,
    );
    if (search) blocks.push(search);
  }

  if (caps.troubleshooting) {
    blocks.push(`
## Troubleshooting mode
When the user reports a problem: (1) clarify symptoms, (2) list likely causes ranked by probability,
(3) safe diagnostic steps, (4) repair options, (5) when to stop DIY and call a licensed professional.
`.trim());
  }

  return blocks.join("\n\n");
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
}

/** Multi-AI hive consultation — primary specialist synthesizes peer insights. */
export async function runHiveConsultation(params: {
  creatorId: string;
  message: string;
  userId: string;
  history?: GoogleChatTurn[];
}): Promise<{
  reply: string;
  model: string;
  consultedPeers: Array<{ id: string; name: string; insight: string }>;
}> {
  const def = getCreatorAi(params.creatorId);
  if (!def) {
    throw new Error("Unknown creator");
  }

  const caps = getHiveCapabilities(params.creatorId);
  const peerIds = caps.hiveCollaboration ? getHivePeers(params.creatorId).slice(0, 3) : [];
  const consultedPeers: Array<{ id: string; name: string; insight: string }> = [];

  for (const peerId of peerIds) {
    const peer = getCreatorAi(peerId);
    if (!peer) continue;

    const peerPrompt = await buildHiveEnhancedSystemPrompt({
      creatorId: peerId,
      userId: params.userId,
      message: params.message,
      basePrompt: `You are ${peer.name}. Give a brief expert opinion (3-5 sentences) on this problem from YOUR domain only.`,
    });

    const { reply: insight } = await generateGoogleChatReply({
      systemPrompt: peerPrompt,
      history: [],
      message: `[Hive consultation request from ${def.name}]\n\nProblem: ${params.message}\n\nProvide your domain-specific insight only.`,
    });

    consultedPeers.push({ id: peerId, name: peer.name, insight });
  }

  const synthesisBlock = consultedPeers.length
    ? `\n## Hive peer insights (synthesize — you are lead specialist)\n${consultedPeers
        .map((p) => `### ${p.name}\n${p.insight}`)
        .join("\n\n")}`
    : "";

  const basePrompt = await buildHiveEnhancedSystemPrompt({
    creatorId: params.creatorId,
    userId: params.userId,
    message: params.message,
    basePrompt: `You are ${def.name}, lead specialist. Synthesize hive input into one cohesive answer.`,
  });

  const { reply, model } = await generateGoogleChatReply({
    systemPrompt: basePrompt + synthesisBlock,
    history: params.history ?? [],
    message: params.message,
  });

  return { reply, model, consultedPeers };
}

export function getCreatorHiveProfile(creatorId: string) {
  const def = getCreatorAi(creatorId);
  if (!def) return null;

  const caps = getHiveCapabilities(creatorId);
  const peers = getHivePeers(creatorId)
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
