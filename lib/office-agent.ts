/** Paid desk for ContentMate and the owner's Business Steward. */

export const OFFICE_AGENT_PRICE_CENTS = 2900;
export const OFFICE_AGENT_DAYS = 30;

export const OFFICE_AGENT_CREATOR_IDS = ["contentmate", "platform-business-steward-ai"] as const;

export type OfficeAgentCreatorId = (typeof OFFICE_AGENT_CREATOR_IDS)[number];

export function isOfficeAgentCreator(creatorId: string): creatorId is OfficeAgentCreatorId {
  return (OFFICE_AGENT_CREATOR_IDS as readonly string[]).includes(creatorId);
}

export function officeAgentPriceLabel(): string {
  return `$${(OFFICE_AGENT_PRICE_CENTS / 100).toFixed(2)}`;
}

/** Told to both assistants. They must not claim a bill was paid. */
export const OFFICE_AGENT_PROMPT = `
## Office Agent desk
ContentMate and Business Steward share this desk. It saves time on member email, calls, and bills.
- The platform owner already has it. Everyone else buys ${officeAgentPriceLabel()} for ${OFFICE_AGENT_DAYS} days. If it is locked, tell them the price and do not pretend you sent anything.
- Send email only to a UR member, and only after the person asks.
- Set a call on the desk. A live video room opens only with an accepted UR friend.
- Prepare a bill (payee, amount, due date). The person must approve it on the desk.
- Approving a bill does not send money. Say that plainly. Never claim the power company, landlord, or any payee was paid.
- When they ask you to email, call, or prepare a bill, end your reply with exactly one line and nothing after it:
  [[OFFICE email|person@email.com|Subject|Message]]
  [[OFFICE call|person@email.com|When|Why]]
  [[OFFICE bill|Payee|84.00|2026-11-01|Note]]
- Do not add that line unless they asked in this message.
`.trim();

export type OfficeAgentAction =
  | { kind: "email"; toEmail: string; subject: string; body: string }
  | { kind: "call"; withEmail: string; whenLabel: string; reason: string }
  | { kind: "bill"; payee: string; amountCents: number; dueDate: string; note: string };

const OFFICE_TAG = /\[\[OFFICE\s+(email|call|bill)\|([\s\S]*?)\]\]/i;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pull one office instruction out of a chat line. The tag is not shown to the person. */
export function takeOfficeAgentAction(text: string): { action: OfficeAgentAction | null; text: string } {
  const match = OFFICE_TAG.exec(text);
  if (!match) return { action: null, text };
  const kind = match[1].toLowerCase() as OfficeAgentAction["kind"];
  const fields = match[2].split("|").map((part) => part.trim());
  const cleaned = text.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim();
  return { action: actionFromFields(kind, fields), text: cleaned };
}

/** Read a plain sentence such as "Prepare a bill for the host, $20, due 2026-11-02." */
export function readPlainOfficeRequest(message: string): OfficeAgentAction | null {
  const bill = message.match(
    /\b(?:prepare|add|file)\s+a\s+bill\s+for\s+(.+?),?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*,?\s*due\s+(\d{4}-\d{2}-\d{2})/i,
  );
  if (bill) {
    const dollars = Number(bill[2].replace(/,/g, ""));
    if (!Number.isFinite(dollars)) return null;
    return {
      kind: "bill",
      payee: bill[1].trim(),
      amountCents: Math.round(dollars * 100),
      dueDate: bill[3],
      note: "",
    };
  }
  const email = message.match(/\b(?:e-?mail|send mail to)\s+([^\s@]+@[^\s@]+\.[^\s@]+)\s+(?:about|saying)\s+(.+)/i);
  if (email) {
    const body = email[2].trim();
    if (!body) return null;
    return { kind: "email", toEmail: email[1].toLowerCase(), subject: "Note from UR", body };
  }
  const call = message.match(/\b(?:call|phone)\s+([^\s@]+@[^\s@]+\.[^\s@]+)\s+(.+?)\s+about\s+(.+)/i);
  if (call) {
    return {
      kind: "call",
      withEmail: call[1].toLowerCase(),
      whenLabel: call[2].trim(),
      reason: call[3].trim(),
    };
  }
  return null;
}

export function memberAskedOfficeWork(message: string, kind: OfficeAgentAction["kind"]): boolean {
  const direct = takeOfficeAgentAction(message).action;
  if (direct?.kind === kind) return true;
  return readPlainOfficeRequest(message)?.kind === kind;
}

function actionFromFields(kind: OfficeAgentAction["kind"], fields: string[]): OfficeAgentAction | null {
  if (kind === "email") {
    const toEmail = fields[0]?.toLowerCase() ?? "";
    const subject = fields[1] ?? "";
    const body = fields.slice(2).join("|").trim();
    if (!EMAIL_SHAPE.test(toEmail) || !subject || !body) return null;
    return { kind, toEmail, subject, body };
  }
  if (kind === "call") {
    const withEmail = fields[0]?.toLowerCase() ?? "";
    const whenLabel = fields[1] ?? "";
    const reason = fields.slice(2).join("|").trim();
    if (!EMAIL_SHAPE.test(withEmail) || !whenLabel || !reason) return null;
    return { kind, withEmail, whenLabel, reason };
  }
  const payee = fields[0] ?? "";
  const dollars = Number((fields[1] ?? "").replace(/[$,]/g, ""));
  const dueDate = fields[2] ?? "";
  const note = fields.slice(3).join("|").trim();
  if (!payee || !dueDate || !Number.isFinite(dollars)) return null;
  return { kind, payee, amountCents: Math.round(dollars * 100), dueDate, note };
}
