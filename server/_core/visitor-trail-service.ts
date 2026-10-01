import { randomUUID } from "crypto";
import { desc, gte } from "drizzle-orm";
import { visitorTrailEvents } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  sanitizeTrailLabel,
  sanitizeTrailPath,
  summarizeVisitorTrail,
  type VisitorTrailEvent,
  type VisitorTrailKind,
  type VisitorTrailReport,
} from "../../lib/visitor-trail";

const MAX_MEMORY_EVENTS = 5_000;
const memoryEvents: VisitorTrailEvent[] = [];

function remember(event: VisitorTrailEvent): void {
  memoryEvents.push(event);
  if (memoryEvents.length > MAX_MEMORY_EVENTS) {
    memoryEvents.splice(0, memoryEvents.length - MAX_MEMORY_EVENTS);
  }
}

export function _resetVisitorTrailForTests(): void {
  memoryEvents.length = 0;
}

export async function recordVisitorTrailEvent(input: {
  visitorId: string;
  kind: VisitorTrailKind;
  path: string;
  label?: string;
  seconds?: number;
  signedIn: boolean;
}): Promise<void> {
  const path = sanitizeTrailPath(input.path);
  if (!path) return;

  const fallbackLabel = input.kind === "button" ? "" : input.kind === "dwell" ? "time on page" : "Opened this page";
  const label = sanitizeTrailLabel(input.label || fallbackLabel);
  if (!label) return;
  if (input.kind === "button" && label === "Opened this page") return;

  const event: VisitorTrailEvent = {
    visitorId: input.visitorId,
    kind: input.kind,
    path,
    label,
    signedIn: input.signedIn,
    seconds: input.kind === "dwell" ? Math.min(7200, Math.max(0, input.seconds ?? 0)) : 0,
    createdAt: new Date().toISOString(),
  };
  remember(event);

  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(visitorTrailEvents).values({
      id: randomUUID(),
      visitorId: event.visitorId,
      kind: event.kind,
      path: event.path,
      label: event.label,
      signedIn: event.signedIn,
      seconds: event.seconds,
      createdAt: new Date(event.createdAt),
    });
  } catch {
    console.warn("[visitor-trail] save failed");
  }
}

export async function getVisitorTrailReport(now: Date): Promise<VisitorTrailReport> {
  const since = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(visitorTrailEvents)
        .where(gte(visitorTrailEvents.createdAt, since))
        .orderBy(desc(visitorTrailEvents.createdAt))
        .limit(8_000);
      const events: VisitorTrailEvent[] = rows.map((row) => ({
        visitorId: row.visitorId,
        kind: row.kind,
        path: row.path,
        label: row.label,
        signedIn: Boolean(row.signedIn),
        seconds: row.seconds,
        createdAt: row.createdAt.toISOString(),
      }));
      return summarizeVisitorTrail(events, now);
    } catch {
      console.warn("[visitor-trail] report failed");
    }
  }
  return summarizeVisitorTrail(memoryEvents, now);
}
