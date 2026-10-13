/** First-party website trail. Pages, buttons, and time on a page. Not typed text. */

export const VISITOR_TRAIL_TIME_ZONE = "America/Indiana/Indianapolis";

export type VisitorTrailKind = "page" | "button" | "dwell";

export type VisitorTrailEvent = {
  visitorId: string;
  kind: VisitorTrailKind;
  path: string;
  label: string;
  signedIn: boolean;
  seconds: number;
  createdAt: string;
};

export type VisitorTrailStop = {
  path: string;
  people: number;
};

export type VisitorTrailButton = {
  label: string;
  path: string;
  presses: number;
};

export type VisitorTrailSlowPage = {
  path: string;
  averageSeconds: number;
  visits: number;
};

export type VisitorTrailPerson = {
  visitorLabel: string;
  firstPath: string;
  lastPath: string;
  journey: string;
  pages: number;
  buttons: number;
  signedUp: boolean;
  lastSeenLabel: string;
};

export type VisitorTrailReport = {
  todayVisitors: number;
  todayUnsigned: number;
  weekVisitors: number;
  weekUnsigned: number;
  weekSignedUp: number;
  stoppedOn: VisitorTrailStop[];
  slowPages: VisitorTrailSlowPage[];
  topButtons: VisitorTrailButton[];
  recent: VisitorTrailPerson[];
};

const PRIVATE_PREFIXES = ["/owner-ai", "/owner-ops", "/admin"];

export function isPrivateTrailPath(path: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Keep the page path. Drop query strings and hashes so reset links and tokens are not stored. */
export function sanitizeTrailPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let path = trimmed;
  if (trimmed.includes("://")) {
    try {
      path = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  } else {
    path = trimmed.split("#")[0]?.split("?")[0] ?? "";
  }

  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.length > 180) return null;
  if (!/^\/[A-Za-z0-9/_-]*$/.test(path)) return null;
  if (isPrivateTrailPath(path)) return null;
  return path;
}

/** Button name only. Emails, keys, and long secrets are not stored. */
export function sanitizeTrailLabel(raw: string): string | null {
  const text = raw.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!text) return null;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return null;
  if (/sk_live_|sk_test_|pk_live_|pk_test_|whsec_|Bearer\s|eyJ[A-Za-z0-9_-]{10,}/i.test(text)) return null;
  if (/[A-Za-z0-9+/_-]{40,}/.test(text)) return null;
  return text;
}

const WEEKDAY_FROM_MONDAY: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function zonedParts(date: Date): { year: number; month: number; day: number; weekday: string } {
  const bag: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: VISITOR_TRAIL_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    weekday: bag.weekday ?? "Mon",
  };
}

function zonedOffsetMs(instant: Date): number {
  const bag: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: VISITOR_TRAIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const hour = bag.hour === "24" ? 0 : Number(bag.hour);
  const asIfUtc = Date.UTC(
    Number(bag.year),
    Number(bag.month) - 1,
    Number(bag.day),
    hour,
    Number(bag.minute),
    Number(bag.second),
  );
  return asIfUtc - instant.getTime();
}

function midnightInIndiana(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  return new Date(guess - zonedOffsetMs(new Date(guess)));
}

/** Today starts at midnight. This week starts Monday morning. Both use Indiana time. */
export function visitorTrailWindow(now: Date): { dayStart: Date; weekStart: Date } {
  const parts = zonedParts(now);
  const dayStart = midnightInIndiana(parts.year, parts.month, parts.day);
  const back = WEEKDAY_FROM_MONDAY[parts.weekday] ?? 0;
  const weekDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  weekDate.setUTCDate(weekDate.getUTCDate() - back);
  const weekStart = midnightInIndiana(
    weekDate.getUTCFullYear(),
    weekDate.getUTCMonth() + 1,
    weekDate.getUTCDate(),
  );
  return { dayStart, weekStart };
}

function clockLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: VISITOR_TRAIL_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

type PersonBuild = {
  visitorId: string;
  events: VisitorTrailEvent[];
  signedUp: boolean;
  firstPath: string;
  lastPath: string;
  pages: number;
  buttons: number;
  lastSeen: string;
};

function buildPeople(events: VisitorTrailEvent[]): PersonBuild[] {
  const byId = new Map<string, VisitorTrailEvent[]>();
  for (const event of events) {
    const list = byId.get(event.visitorId) ?? [];
    list.push(event);
    byId.set(event.visitorId, list);
  }

  const people: PersonBuild[] = [];
  for (const [visitorId, list] of byId) {
    const ordered = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const pages = ordered.filter((event) => event.kind === "page");
    const firstPath = pages[0]?.path ?? ordered[0]?.path ?? "/";
    const lastPath = pages.at(-1)?.path ?? ordered.at(-1)?.path ?? firstPath;
    people.push({
      visitorId,
      events: ordered,
      signedUp: ordered.some((event) => event.signedIn),
      firstPath,
      lastPath,
      pages: pages.length,
      buttons: ordered.filter((event) => event.kind === "button").length,
      lastSeen: ordered.at(-1)?.createdAt ?? "",
    });
  }
  return people;
}

function journeyFor(person: PersonBuild): string {
  const steps: string[] = [];
  for (const event of person.events) {
    if (event.kind === "dwell") continue;
    const step = event.kind === "page" ? event.path : event.label;
    if (!step || steps.at(-1) === step) continue;
    steps.push(step);
    if (steps.length >= 8) break;
  }
  return steps.join(" → ");
}

function inWindow(iso: string, start: Date, now: Date): boolean {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time <= now.getTime() + 60_000;
}

export function summarizeVisitorTrail(events: VisitorTrailEvent[], now: Date): VisitorTrailReport {
  const { dayStart, weekStart } = visitorTrailWindow(now);
  const inWeek = events.filter((event) => inWindow(event.createdAt, weekStart, now));
  const inToday = inWeek.filter((event) => inWindow(event.createdAt, dayStart, now));
  const people = buildPeople(inWeek);
  const todayPeople = buildPeople(inToday);
  const unsigned = people.filter((person) => !person.signedUp);

  const lastPages = new Map<string, number>();
  for (const person of unsigned) {
    lastPages.set(person.lastPath, (lastPages.get(person.lastPath) ?? 0) + 1);
  }

  const dwellByPath = new Map<string, { seconds: number; visits: number }>();
  for (const person of unsigned) {
    for (const event of person.events) {
      if (event.kind !== "dwell" || event.seconds < 2) continue;
      const row = dwellByPath.get(event.path) ?? { seconds: 0, visits: 0 };
      row.seconds += event.seconds;
      row.visits += 1;
      dwellByPath.set(event.path, row);
    }
  }

  const buttons = new Map<string, VisitorTrailButton>();
  for (const event of inWeek) {
    if (event.kind !== "button") continue;
    const key = `${event.path}\0${event.label}`;
    const row = buttons.get(key) ?? { label: event.label, path: event.path, presses: 0 };
    row.presses += 1;
    buttons.set(key, row);
  }

  return {
    todayVisitors: todayPeople.length,
    todayUnsigned: todayPeople.filter((person) => !person.signedUp).length,
    weekVisitors: people.length,
    weekUnsigned: unsigned.length,
    weekSignedUp: people.length - unsigned.length,
    stoppedOn: [...lastPages.entries()]
      .map(([path, count]) => ({ path, people: count }))
      .sort((a, b) => b.people - a.people)
      .slice(0, 6),
    slowPages: [...dwellByPath.entries()]
      .map(([path, row]) => ({
        path,
        averageSeconds: Math.round(row.seconds / row.visits),
        visits: row.visits,
      }))
      .sort((a, b) => b.averageSeconds - a.averageSeconds)
      .slice(0, 6),
    topButtons: [...buttons.values()].sort((a, b) => b.presses - a.presses).slice(0, 8),
    recent: [...people]
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 15)
      .map((person) => ({
        visitorLabel: `Visitor ${person.visitorId.slice(0, 4)}`,
        firstPath: person.firstPath,
        lastPath: person.lastPath,
        journey: journeyFor(person),
        pages: person.pages,
        buttons: person.buttons,
        signedUp: person.signedUp,
        lastSeenLabel: clockLabel(person.lastSeen),
      })),
  };
}
