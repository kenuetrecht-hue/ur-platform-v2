import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import {
  OFFICE_AGENT_DAYS,
  OFFICE_AGENT_PRICE_CENTS,
  isOfficeAgentCreator,
  memberAskedOfficeWork,
  officeAgentPriceLabel,
  readPlainOfficeRequest,
  takeOfficeAgentAction,
} from "../../lib/office-agent";
import { sanitizeUserText } from "./input-sanitize";
import { sendPlatformMail, resolveUserIdByEmail } from "./social-service";
import { createVideoCall } from "./video-call-service";

export type OfficeBill = {
  id: string;
  userId: string;
  creatorId: string;
  payee: string;
  amountCents: number;
  dueDate: string;
  note: string;
  status: "needs_approval" | "approved";
  /** Always false. This desk does not send money to a payee. */
  moneyMoved: false;
  createdAt: string;
};

export type OfficeCall = {
  id: string;
  userId: string;
  creatorId: string;
  withWhom: string;
  reason: string;
  whenLabel: string;
  roomId: string | null;
  note: string;
  createdAt: string;
};

type Entitlement = {
  userId: string;
  purchasedAt: string;
  expiresAt: string;
};

const entitlements = new Map<string, Entitlement>();
const bills = new Map<string, OfficeBill>();
const calls = new Map<string, OfficeCall>();

export function resetOfficeAgentForTests(): void {
  entitlements.clear();
  bills.clear();
  calls.clear();
}

export function grantOfficeAgent(userId: string, now = Date.now()): Entitlement {
  const purchasedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + OFFICE_AGENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const row: Entitlement = { userId, purchasedAt, expiresAt };
  entitlements.set(userId, row);
  return row;
}

export function hasOfficeAgentAccess(userId: string, isPlatformOwner: boolean, now = Date.now()): boolean {
  if (isPlatformOwner) return true;
  const row = entitlements.get(userId);
  if (!row) return false;
  return new Date(row.expiresAt).getTime() > now;
}

export function officeAgentStatus(userId: string, isPlatformOwner: boolean) {
  const row = entitlements.get(userId);
  return {
    unlocked: hasOfficeAgentAccess(userId, isPlatformOwner),
    ownerIncluded: isPlatformOwner,
    priceCents: OFFICE_AGENT_PRICE_CENTS,
    priceLabel: officeAgentPriceLabel(),
    days: OFFICE_AGENT_DAYS,
    expiresAt: row?.expiresAt ?? null,
    bills: [...bills.values()].filter((bill) => bill.userId === userId).slice(-20),
    calls: [...calls.values()].filter((call) => call.userId === userId).slice(-20),
  };
}

function assertDesk(params: { userId: string; isPlatformOwner: boolean; creatorId: string }): void {
  if (!isOfficeAgentCreator(params.creatorId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This assistant does not run the Office Agent desk." });
  }
  if (params.creatorId === "platform-business-steward-ai" && !params.isPlatformOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Business Steward is the owner's desk." });
  }
  if (!hasOfficeAgentAccess(params.userId, params.isPlatformOwner)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Office Agent is ${officeAgentPriceLabel()} for ${OFFICE_AGENT_DAYS} days. Buy it to send mail, set calls, and prepare bills.`,
    });
  }
}

export function sendOfficeAgentEmail(params: {
  userId: string;
  isPlatformOwner: boolean;
  creatorId: string;
  senderEmail: string;
  senderName: string;
  toEmail: string;
  subject: string;
  body: string;
}) {
  assertDesk(params);
  return sendPlatformMail({
    senderUserId: params.userId,
    senderEmail: params.senderEmail,
    senderName: sanitizeUserText(params.senderName || "UR Member", 80) || "UR Member",
    toEmail: params.toEmail.trim().toLowerCase(),
    subject: sanitizeUserText(params.subject, 120),
    body: sanitizeUserText(params.body, 2000),
  });
}

export function scheduleOfficeAgentCall(params: {
  userId: string;
  isPlatformOwner: boolean;
  creatorId: string;
  callerName?: string;
  withEmail: string;
  reason: string;
  whenLabel: string;
}): OfficeCall {
  assertDesk(params);
  const withEmail = params.withEmail.trim().toLowerCase();
  const reason = sanitizeUserText(params.reason, 400);
  const whenLabel = sanitizeUserText(params.whenLabel, 80);
  let roomId: string | null = null;
  let note = "Saved on your desk. A live video room opens only with an accepted UR friend.";
  const calleeUserId = resolveUserIdByEmail(withEmail);
  if (calleeUserId && calleeUserId !== params.userId) {
    try {
      const room = createVideoCall({
        callerUserId: params.userId,
        calleeUserId,
        callerName: params.callerName,
      });
      roomId = room.id;
      note = "Live video room is open with that friend.";
    } catch {
      note = "Saved. They have a UR account, and a live room opens after you are friends.";
    }
  } else if (!calleeUserId) {
    note = "Saved. That email is not a UR member yet, so this call stays on the desk.";
  }

  const call: OfficeCall = {
    id: randomUUID(),
    userId: params.userId,
    creatorId: params.creatorId,
    withWhom: withEmail,
    reason,
    whenLabel,
    roomId,
    note,
    createdAt: new Date().toISOString(),
  };
  calls.set(call.id, call);
  return call;
}

export function fileOfficeAgentBill(params: {
  userId: string;
  isPlatformOwner: boolean;
  creatorId: string;
  payee: string;
  amountCents: number;
  dueDate: string;
  note?: string;
}): OfficeBill {
  assertDesk(params);
  if (!Number.isInteger(params.amountCents) || params.amountCents < 50 || params.amountCents > 100_000_00) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Bill amount must be between $0.50 and $100,000." });
  }
  const bill: OfficeBill = {
    id: randomUUID(),
    userId: params.userId,
    creatorId: params.creatorId,
    payee: sanitizeUserText(params.payee, 120),
    amountCents: params.amountCents,
    dueDate: sanitizeUserText(params.dueDate, 40),
    note: sanitizeUserText(params.note ?? "", 400),
    status: "needs_approval",
    moneyMoved: false,
    createdAt: new Date().toISOString(),
  };
  bills.set(bill.id, bill);
  return bill;
}

/** Run one desk step the person asked for in chat. A locked desk does not send anything. */
export function applyOfficeAgentChatAction(params: {
  userId: string;
  isPlatformOwner: boolean;
  creatorId: string;
  userMessage: string;
  aiReply: string;
  senderEmail: string;
  senderName: string;
}): string {
  if (!isOfficeAgentCreator(params.creatorId)) return params.aiReply;
  const fromUser = takeOfficeAgentAction(params.userMessage);
  const fromReply = takeOfficeAgentAction(params.aiReply);
  const plain = readPlainOfficeRequest(params.userMessage);
  const action = fromUser.action ?? plain ?? fromReply.action;
  const reply = fromReply.text;
  if (!action) return reply;
  if (!fromUser.action && !memberAskedOfficeWork(params.userMessage, action.kind)) return reply;
  if (!hasOfficeAgentAccess(params.userId, params.isPlatformOwner)) {
    return `${reply}\n\nOffice Agent is ${officeAgentPriceLabel()} for ${OFFICE_AGENT_DAYS} days. Unlock the desk on this chat. Nothing was sent, and no bill was paid.`.trim();
  }
  try {
    if (action.kind === "email") {
      sendOfficeAgentEmail({
        userId: params.userId,
        isPlatformOwner: params.isPlatformOwner,
        creatorId: params.creatorId,
        senderEmail: params.senderEmail,
        senderName: params.senderName,
        toEmail: action.toEmail,
        subject: action.subject,
        body: action.body,
      });
      return `${reply}\n\nEmail sent to that UR member.`.trim();
    }
    if (action.kind === "call") {
      const call = scheduleOfficeAgentCall({
        userId: params.userId,
        isPlatformOwner: params.isPlatformOwner,
        creatorId: params.creatorId,
        callerName: params.senderName,
        withEmail: action.withEmail,
        reason: action.reason,
        whenLabel: action.whenLabel,
      });
      return `${reply}\n\n${call.note}`.trim();
    }
    const bill = fileOfficeAgentBill({
      userId: params.userId,
      isPlatformOwner: params.isPlatformOwner,
      creatorId: params.creatorId,
      payee: action.payee,
      amountCents: action.amountCents,
      dueDate: action.dueDate,
      note: action.note,
    });
    return `${reply}\n\n${bill.payee} is on the desk for $${(bill.amountCents / 100).toFixed(2)}. Approve it there. Approving it does not send the money.`.trim();
  } catch (error) {
    const message = error instanceof TRPCError ? error.message : "That office step could not be completed.";
    return `${reply}\n\n${message}`.trim();
  }
}

export function approveOfficeAgentBill(params: {
  userId: string;
  isPlatformOwner: boolean;
  creatorId: string;
  billId: string;
}): OfficeBill {
  assertDesk(params);
  const bill = bills.get(params.billId);
  if (!bill || bill.userId !== params.userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That bill is not on your desk." });
  }
  bill.status = "approved";
  bill.moneyMoved = false;
  return bill;
}
