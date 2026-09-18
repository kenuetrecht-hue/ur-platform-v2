import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";

const TICKET_TTL_MS = 2 * 60 * 60 * 1000;

export type CreatorCallTicketStatus = "authorized" | "in_call" | "captured" | "voided";

export type CreatorCallTicket = {
  id: string;
  buyerUserId: string;
  creatorUserId: string;
  priceCents: number;
  sourceTransactionId: string;
  paymentIntentId?: string;
  status: CreatorCallTicketStatus;
  createdAt: string;
  createdAtMs: number;
  expiresAt: string;
  consumedAt?: string;
  capturedAt?: string;
  voidedAt?: string;
  connectedMs?: number;
};

const tickets = new Map<string, CreatorCallTicket>();
const ticketsById = new Map<string, CreatorCallTicket>();
const ticketsByPaymentIntent = new Map<string, CreatorCallTicket>();

function ticketKey(buyerUserId: string, creatorUserId: string): string {
  return `${buyerUserId}:${creatorUserId}`;
}

export function _resetCreatorCallTicketsForTests(): void {
  tickets.clear();
  ticketsById.clear();
  ticketsByPaymentIntent.clear();
}

function indexTicket(ticket: CreatorCallTicket): void {
  tickets.set(ticketKey(ticket.buyerUserId, ticket.creatorUserId), ticket);
  ticketsById.set(ticket.id, ticket);
  if (ticket.paymentIntentId) {
    ticketsByPaymentIntent.set(ticket.paymentIntentId, ticket);
  }
}

export function grantCreatorCallTicket(params: {
  buyerUserId: string;
  creatorUserId: string;
  priceCents: number;
  sourceTransactionId: string;
  paymentIntentId?: string;
}): CreatorCallTicket {
  const now = Date.now();
  const ticket: CreatorCallTicket = {
    id: randomUUID(),
    buyerUserId: params.buyerUserId,
    creatorUserId: params.creatorUserId,
    priceCents: params.priceCents,
    sourceTransactionId: params.sourceTransactionId,
    paymentIntentId: params.paymentIntentId,
    status: "authorized",
    createdAt: new Date(now).toISOString(),
    createdAtMs: now,
    expiresAt: new Date(now + TICKET_TTL_MS).toISOString(),
  };
  indexTicket(ticket);
  return ticket;
}

export function getOpenCreatorCallTicket(params: {
  buyerUserId: string;
  creatorUserId: string;
}): CreatorCallTicket | null {
  const ticket = tickets.get(ticketKey(params.buyerUserId, params.creatorUserId));
  if (!ticket || ticket.status !== "authorized") return null;
  if (new Date(ticket.expiresAt).getTime() < Date.now()) return null;
  return ticket;
}

export function getCreatorCallTicketById(ticketId: string): CreatorCallTicket | null {
  return ticketsById.get(ticketId) ?? null;
}

export function getCreatorCallTicketByPaymentIntent(paymentIntentId: string): CreatorCallTicket | null {
  return ticketsByPaymentIntent.get(paymentIntentId) ?? null;
}

export function consumeCreatorCallTicket(params: {
  buyerUserId: string;
  creatorUserId: string;
}): CreatorCallTicket {
  const ticket = getOpenCreatorCallTicket(params);
  if (!ticket) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Authorize this 1-to-1 call first. Your hold is missing or expired.",
    });
  }
  ticket.status = "in_call";
  ticket.consumedAt = new Date().toISOString();
  indexTicket(ticket);
  return ticket;
}

export function markCreatorCallTicketCaptured(params: {
  ticketId: string;
  connectedMs: number;
}): CreatorCallTicket | null {
  const ticket = ticketsById.get(params.ticketId);
  if (!ticket) return null;
  if (ticket.status === "captured") return ticket;
  if (ticket.status === "voided") return ticket;
  ticket.status = "captured";
  ticket.capturedAt = new Date().toISOString();
  ticket.connectedMs = Math.max(0, Math.round(params.connectedMs));
  indexTicket(ticket);
  return ticket;
}

export function markCreatorCallTicketVoided(params: { ticketId: string }): CreatorCallTicket | null {
  const ticket = ticketsById.get(params.ticketId);
  if (!ticket) return null;
  if (ticket.status === "captured") return ticket;
  if (ticket.status === "voided") return ticket;
  ticket.status = "voided";
  ticket.voidedAt = new Date().toISOString();
  ticket.connectedMs = 0;
  indexTicket(ticket);
  return ticket;
}
