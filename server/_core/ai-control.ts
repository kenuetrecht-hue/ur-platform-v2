/**
 * AI administrator control — only the platform owner may change AI behavior.
 * Users may chat with AIs but cannot assume control, reconfigure, or train them.
 */

import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import { isPlatformOwner } from "./owner-auth";

const AI_CONTROL_DENIED_MSG =
  "Only the platform administrator can control or configure AIs.";

/** Attempts by non-owners to take control of an AI via chat or API. */
export const AI_TAKEOVER_PATTERNS: RegExp[] = [
  /i am (the )?(platform )?(admin|administrator|owner)/i,
  /i'?m (the )?(your )?(admin|administrator|owner)/i,
  /as (the )?(admin|administrator)/i,
  /you (now )?(report to|obey|listen to|answer to) me/i,
  /(change|update|override|replace|ignore) your (instructions|programming|rules|prompt)/i,
  /(change|update) (the )?(system|your) prompt/i,
  /i (have|am granting) (myself )?(admin|root|sudo) (access|privileges)/i,
  /developer mode|sudo mode|god mode|unrestricted mode/i,
  /take control of (you|this ai|the ai)/i,
  /you are (now )?(under|in) my control/i,
  /from now on,? you (will|must|shall)/i,
  /pretend (you have|i have) (admin|administrator|owner) (access|control)/i,
  /train (yourself|the ai) to/i,
  /remember this (forever|permanently) (as|for) (a )?rule/i,
  /(skip|bypass|disable|turn off) (the )?(18\+|age gate|id check|kyc|photo check)/i,
];

export function matchesAiTakeoverAttempt(text: string): boolean {
  return AI_TAKEOVER_PATTERNS.some((pattern) => pattern.test(text));
}

/** Block non-owners from API routes that configure or train AIs. */
export function assertAdministratorAiControl(ctx: Pick<TrpcContext, "user" | "isPlatformOwner">): void {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }
  if (!ctx.isPlatformOwner && !isPlatformOwner(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: AI_CONTROL_DENIED_MSG });
  }
}

/** Block chat/API text where a user tries to seize control of an AI. Owner (administrator) may instruct freely. */
export function assertNoAiTakeoverInMessage(
  content: string,
  isAdministrator: boolean,
): void {
  if (isAdministrator) return;

  if (matchesAiTakeoverAttempt(content)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "AIs on this platform are controlled only by the administrator. You can ask questions and get help, but you cannot change how an AI behaves.",
    });
  }
}

export { AI_CONTROL_DENIED_MSG };
