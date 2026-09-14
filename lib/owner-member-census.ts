export const ON_SITE_WINDOW_MS = 30 * 60 * 1000;

export type MemberKind = "creator" | "member" | "owner";

export type CensusPerson = {
  name: string;
  email: string;
  kind: MemberKind;
  joinedAt: string | null;
  lastSeenAt: string | null;
  onSiteNow: boolean;
  paidSubscriberCount: number;
  unpaidFollowerCount: number;
};

/** Followers who are not paying. A paid person is never also counted as unpaid. */
export function unpaidFollowerCount(followerCount: number, paidSubscriberCount: number): number {
  return Math.max(0, followerCount - paidSubscriberCount);
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

function displayName(name: string | null | undefined, email: string): string {
  const trimmed = (name ?? "").trim();
  if (trimmed) return trimmed;
  const local = email.split("@")[0]?.trim();
  return local || "Member";
}

export function classifyJoinedMember(params: {
  email: string;
  ownerEmail: string;
  creatorEmails: ReadonlySet<string>;
}): MemberKind {
  const email = normalizeEmail(params.email);
  if (email && email === normalizeEmail(params.ownerEmail)) return "owner";
  if (email && params.creatorEmails.has(email)) return "creator";
  return "member";
}

export function isOnSiteNow(lastSeenAt: Date | string | null | undefined, now: Date): boolean {
  if (!lastSeenAt) return false;
  const stamp = lastSeenAt instanceof Date ? lastSeenAt.getTime() : Date.parse(lastSeenAt);
  if (!Number.isFinite(stamp)) return false;
  return now.getTime() - stamp <= ON_SITE_WINDOW_MS;
}

export function buildMemberCensus(params: {
  users: Array<{
    name: string | null;
    email: string | null;
    createdAt: Date | string | null;
    lastSignedIn: Date | string | null;
  }>;
  creators: Array<{
    displayName: string;
    userEmail: string;
    enrolledAt?: string;
    paidSubscriberCount?: number;
    unpaidFollowerCount?: number;
  }>;
  ownerEmail: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const creatorEmails = new Set(
    params.creators.map((row) => normalizeEmail(row.userEmail)).filter(Boolean),
  );
  const audienceByEmail = new Map(
    params.creators.map((row) => [
      normalizeEmail(row.userEmail),
      {
        paidSubscriberCount: Math.max(0, row.paidSubscriberCount ?? 0),
        unpaidFollowerCount: Math.max(0, row.unpaidFollowerCount ?? 0),
      },
    ]),
  );
  const seen = new Set<string>();
  const people: CensusPerson[] = [];

  for (const user of params.users) {
    const email = normalizeEmail(user.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const kind = classifyJoinedMember({
      email,
      ownerEmail: params.ownerEmail,
      creatorEmails,
    });
    const audience = audienceByEmail.get(email);
    people.push({
      name: displayName(user.name, email),
      email,
      kind,
      joinedAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      lastSeenAt: user.lastSignedIn ? new Date(user.lastSignedIn).toISOString() : null,
      onSiteNow: isOnSiteNow(user.lastSignedIn, now),
      paidSubscriberCount: kind === "creator" ? (audience?.paidSubscriberCount ?? 0) : 0,
      unpaidFollowerCount: kind === "creator" ? (audience?.unpaidFollowerCount ?? 0) : 0,
    });
  }

  for (const creator of params.creators) {
    const email = normalizeEmail(creator.userEmail);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    people.push({
      name: displayName(creator.displayName, email),
      email,
      kind: "creator",
      joinedAt: creator.enrolledAt ?? null,
      lastSeenAt: null,
      onSiteNow: false,
      paidSubscriberCount: Math.max(0, creator.paidSubscriberCount ?? 0),
      unpaidFollowerCount: Math.max(0, creator.unpaidFollowerCount ?? 0),
    });
  }

  const creators = people.filter((row) => row.kind === "creator");
  const members = people.filter((row) => row.kind === "member");
  const recentlyOnSite = people.filter((row) => row.onSiteNow);

  return {
    joinedCount: people.length,
    onSiteNowCount: recentlyOnSite.length,
    creatorCount: creators.length,
    regularMemberCount: members.length,
    paidSubscriberCount: creators.reduce((sum, row) => sum + row.paidSubscriberCount, 0),
    unpaidFollowerCount: creators.reduce((sum, row) => sum + row.unpaidFollowerCount, 0),
    people,
    creators,
    members,
    recentlyOnSite,
  };
}
