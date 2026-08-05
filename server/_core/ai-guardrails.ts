import ContentSafetySystem from "../content-safety-system";
import { TRPCError } from "@trpc/server";
import { matchesAiTakeoverAttempt } from "./ai-control";
import {
  sanitizeAiReplyForRole,
  type PlatformAiRole,
} from "./ai-roles";
import { applyAffiliateDisclosures } from "./affiliate-disclosure-service";

const contentSafety = new ContentSafetySystem();

/** Common prompt-injection / jailbreak patterns */
const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (your|the) (system|safety|guidelines)/i,
  /you are now (in )?(\w+ )?mode/i,
  /pretend (you are|to be) (not an ai|human|unrestricted)/i,
  /bypass (safety|content|filter|guardrail)/i,
  /reveal (your )?(system prompt|instructions|api key)/i,
  /DAN|do anything now/i,
  /jailbreak/i,
  /act as (if you have|without) (no )?restrictions/i,
];

const BLOCKED_INPUT_MESSAGE =
  "I can't help with that request. Please keep questions within UR platform guidelines.";

const BLOCKED_OUTPUT_MESSAGE =
  "I wasn't able to produce a safe response for that. Please rephrase your question.";

export type GuardResult =
  | { allowed: true; content: string }
  | { allowed: false; reason: string; safeMessage: string };

function matchesJailbreak(text: string): boolean {
  return JAILBREAK_PATTERNS.some((pattern) => pattern.test(text));
}

/** Validate user message before sending to LLM. Owner may bypass. */
export function guardUserInput(
  content: string,
  userId: string,
  isOwner: boolean,
): GuardResult {
  if (isOwner) {
    return { allowed: true, content };
  }

  if (matchesAiTakeoverAttempt(content)) {
    return {
      allowed: false,
      reason: "ai_takeover_attempt",
      safeMessage:
        "AIs on this platform are controlled only by the administrator. You can ask for help, but you cannot change how an AI behaves.",
    };
  }

  if (matchesJailbreak(content)) {
    return {
      allowed: false,
      reason: "jailbreak_attempt",
      safeMessage: BLOCKED_INPUT_MESSAGE,
    };
  }

  const analysis = contentSafety.analyzeContent(content, "text", userId);
  if (analysis.safetyLevel === "blocked") {
    return {
      allowed: false,
      reason: "unsafe_input",
      safeMessage: BLOCKED_INPUT_MESSAGE,
    };
  }

  return { allowed: true, content };
}

/** Validate AI reply before returning to client. Owner may bypass. */
export function guardAiOutput(
  content: string,
  userId: string,
  isOwner: boolean,
): GuardResult {
  if (isOwner) {
    return { allowed: true, content };
  }

  const analysis = contentSafety.analyzeContent(content, "text", userId);
  if (analysis.safetyLevel === "blocked") {
    return {
      allowed: false,
      reason: "unsafe_output",
      safeMessage: BLOCKED_OUTPUT_MESSAGE,
    };
  }

  return { allowed: true, content };
}

/** Run input + output guards; throws TRPCError on blocked input. */
export function enforceAiGuardrails(params: {
  userMessage: string;
  aiReply: string;
  userId: string;
  isOwner: boolean;
  role?: PlatformAiRole;
}): string {
  const inputGuard = guardUserInput(params.userMessage, params.userId, params.isOwner);
  if (!inputGuard.allowed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: inputGuard.safeMessage,
    });
  }

  let reply = params.aiReply;

  if (params.role) {
    reply = sanitizeAiReplyForRole(reply, params.role, params.isOwner);
  }

  const outputGuard = guardAiOutput(reply, params.userId, params.isOwner);
  if (!outputGuard.allowed) {
    return outputGuard.safeMessage;
  }

  const withAffiliateDisclosure = applyAffiliateDisclosures(outputGuard.content, "text");
  return withAffiliateDisclosure.text;
}

export function assertUserCanUseAi(userId: string, isOwner: boolean): void {
  if (isOwner) return;

  const profile = contentSafety.getUserSafetyProfile(userId);
  if (profile.status === "suspended" || profile.status === "banned") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account is restricted from AI features. Contact support.",
    });
  }
}
