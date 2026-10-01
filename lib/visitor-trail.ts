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

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VISITOR_TRAIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

export function summarizeVisitorTrail(events: VisitorTrailEvent[], now: Date): VisitorTrailReport {
  const weekStart = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const inWeek = events.filter((event) => {
    const time = new Date(event.createdAt).getTime();
    return Number.isFinite(time) && time >= weekStart && time <= now.getTime() + 60_000;
  });
  const people = buildPeople(inWeek);
  const today = dayKey(now);
  const todayPeople = people.filter((person) =>
    person.events.some((event) => dayKey(new Date(event.createdAt)) === today),
  );
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
