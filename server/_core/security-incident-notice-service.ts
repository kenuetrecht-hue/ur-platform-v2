/**
 * Member security notices — used when we learn account information may have been stolen.
 * In-app notice is immediate. Email is queued until a mailer is configured.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { sanitizeUserText } from "./input-sanitize";
import { SECURITY_BREACH_PROMISE } from "../../lib/signup-step-copy";

export type SecurityIncidentNotice = {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  publishedByUserId: string;
  emailQueued: true;
  emailSent: false;
};

const notices: SecurityIncidentNotice[] = [];
const acks = new Map<string, Set<string>>();

export function _resetSecurityIncidentNoticesForTests(): void {
  notices.length = 0;
  acks.clear();
}

export function publishSecurityIncidentNotice(params: {
  ownerUserId: string;
  title: string;
  body: string;
}): SecurityIncidentNotice {
  const title = sanitizeUserText(params.title, 120);
  const body = sanitizeUserText(params.body, 2000);
  if (!title || !body) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Write a short title and what members should do." });
  }
  const notice: SecurityIncidentNotice = {
    id: randomUUID(),
    title,
    body,
    publishedAt: new Date().toISOString(),
    publishedByUserId: params.ownerUserId,
    emailQueued: true,
    emailSent: false,
  };
  notices.unshift(notice);
  acks.set(notice.id, new Set());
  return notice;
}

export function listSecurityIncidentNotices(): SecurityIncidentNotice[] {
  return [...notices];
}

export function getActiveSecurityNoticeForMember(userId: string): {
  required: boolean;
  notice: SecurityIncidentNotice | null;
  promise: string;
} {
  const latest = notices[0] ?? null;
  if (!latest) {
    return { required: false, notice: null, promise: SECURITY_BREACH_PROMISE };
  }
  const seen = acks.get(latest.id);
  if (seen?.has(userId)) {
    return { required: false, notice: latest, promise: SECURITY_BREACH_PROMISE };
  }
  return { required: true, notice: latest, promise: SECURITY_BREACH_PROMISE };
}

export function acknowledgeSecurityIncidentNotice(params: {
  userId: string;
  noticeId: string;
}): { ok: true } {
  const notice = notices.find((row) => row.id === params.noticeId);
  if (!notice) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That security notice is no longer active." });
  }
  const seen = acks.get(notice.id) ?? new Set();
  seen.add(params.userId);
  acks.set(notice.id, seen);
  return { ok: true };
}
