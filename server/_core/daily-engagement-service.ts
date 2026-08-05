/**
 * Daily engagement — streaks, specialist-of-the-day, challenges, and continue sessions.
 */

import { ALL_CREATOR_AI_IDS, getCreatorAi } from "./ai-creator-registry";
import { isOwnerOnlyPlatformAi } from "./platform-ops-ai";

export type DailyChallenge = {
  id: string;
  title: string;
  prompt: string;
  estimatedMinutes: number;
  category: string;
};

export type UserDailyEngagement = {
  userId: string;
  streakDays: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalActiveDays: number;
  lastCreatorId: string | null;
  lastCreatorName: string | null;
  challengesCompletedToday: number;
  updatedAt: string;
};

const engagementStore = new Map<string, UserDailyEngagement>();

const CATEGORY_DAILY_TIPS: Record<string, string[]> = {
  Construction: [
    "Measure twice, cut once — double-check your layout before any cut.",
    "Inspect PPE before every job. A 30-second check prevents hours of regret.",
    "Document today's work with photos. Future you will thank you.",
  ],
  Engineering: [
    "Always sanity-check your units — most errors start with a unit mismatch.",
    "Sketch the problem before opening the calculator.",
    "When in doubt, apply a factor of safety and document assumptions.",
  ],
  Platform: [
    "Batch content: film 3 short clips today instead of one tomorrow.",
    "Reply to 5 comments in your niche — engagement compounds.",
    "Review analytics for 10 minutes. One insight beats ten blind posts.",
  ],
  "Legal Reference": [
    "Research one primary source today — statutes beat summaries.",
    "Organize notes by issue, not document. Retrieval speed wins.",
    "Explain today's concept in plain language to lock it in.",
  ],
  Finance: [
    "Reconcile one account today — small consistency beats monthly panic.",
    "Track one expense category you usually ignore.",
    "Review cash flow weekly. Liquidity problems announce themselves early.",
  ],
  Technology: [
    "Write one test before fixing a bug — lock in expected behavior.",
    "Read error messages fully. The answer is usually in line 3.",
    "Commit small, commit often. Future you will thank present you.",
  ],
  "Game Development": [
    "Playtest for 5 minutes before adding features — feel beats specs.",
    "One mechanic, polished, beats ten half-done systems.",
    "Document your core loop in one sentence. If you can't, simplify.",
  ],
  Language: [
    "Learn 5 new words and use each in a sentence out loud.",
    "Shadow a native speaker for 5 minutes — mimic rhythm, not just words.",
    "Switch one app to your target language for an hour.",
  ],
  default: [
    "Fifteen focused minutes beat three distracted hours.",
    "Teach someone one thing you learned this week.",
    "Ask your AI one 'why' question today, not just 'how'.",
  ],
};

const CHALLENGE_TEMPLATES: Record<string, Omit<DailyChallenge, "id">> = {
  Construction: {
    title: "5-Minute Safety Scan",
    prompt: "Walk me through a quick job-site safety checklist for my trade.",
    estimatedMinutes: 5,
    category: "Construction",
  },
  Engineering: {
    title: "One Calculation Deep-Dive",
    prompt: "Give me one practice calculation at intermediate level with steps.",
    estimatedMinutes: 10,
    category: "Engineering",
  },
  Platform: {
    title: "Content Spark",
    prompt: "Give me 3 content ideas I can film today with hooks for the first 3 seconds.",
    estimatedMinutes: 5,
    category: "Platform",
  },
  Language: {
    title: "Daily Language Drill",
    prompt: "Start a 5-minute conversation drill and correct my grammar gently.",
    estimatedMinutes: 5,
    category: "Language",
  },
  "Game Development": {
    title: "10-Minute Game Slice",
    prompt: "Help me add one small feature to my game project and test it in the sandbox.",
    estimatedMinutes: 10,
    category: "Game Development",
  },
  default: {
    title: "Daily Expert Challenge",
    prompt: "Give me one hands-on exercise I can finish in 10 minutes in your specialty.",
    estimatedMinutes: 10,
    category: "General",
  },
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function publicCreatorIds(): string[] {
  return ALL_CREATOR_AI_IDS.filter((id) => !isOwnerOnlyPlatformAi(id));
}

export function getSpecialistOfDay(forDate = new Date()) {
  const ids = publicCreatorIds();
  const index = Math.floor(forDate.getTime() / 86400000) % ids.length;
  const creatorId = ids[index]!;
  const def = getCreatorAi(creatorId)!;
  return {
    creatorId,
    name: def.name,
    avatar: def.avatar,
    category: def.category,
    mission: def.mission,
    dayLabel: forDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
  };
}

export function getDailyInsight(creatorId: string): string {
  const def = getCreatorAi(creatorId);
  const tips = CATEGORY_DAILY_TIPS[def?.category ?? ""] ?? CATEGORY_DAILY_TIPS.default!;
  return tips[dayOfYear() % tips.length]!;
}

export function getDailyChallenge(creatorId: string): DailyChallenge {
  const def = getCreatorAi(creatorId);
  const template = CHALLENGE_TEMPLATES[def?.category ?? ""] ?? CHALLENGE_TEMPLATES.default!;
  return { id: `challenge-${todayKey()}-${creatorId}`, ...template };
}

function getOrCreateEngagement(userId: string): UserDailyEngagement {
  const existing = engagementStore.get(userId);
  if (existing) return existing;
  const record: UserDailyEngagement = {
    userId,
    streakDays: 0,
    longestStreak: 0,
    lastActiveDate: null,
    totalActiveDays: 0,
    lastCreatorId: null,
    lastCreatorName: null,
    challengesCompletedToday: 0,
    updatedAt: new Date().toISOString(),
  };
  engagementStore.set(userId, record);
  return record;
}

function isYesterday(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
}

export function recordUserActivity(params: {
  userId: string;
  creatorId?: string;
  activityType: "chat" | "learn" | "challenge";
}): UserDailyEngagement {
  const record = getOrCreateEngagement(params.userId);
  const today = todayKey();

  if (record.lastActiveDate !== today) {
    if (record.lastActiveDate && isYesterday(record.lastActiveDate)) {
      record.streakDays += 1;
    } else {
      record.streakDays = 1;
    }
    record.lastActiveDate = today;
    record.totalActiveDays += 1;
    record.challengesCompletedToday = 0;
    record.longestStreak = Math.max(record.longestStreak, record.streakDays);
  }

  if (params.creatorId) {
    record.lastCreatorId = params.creatorId;
    const def = getCreatorAi(params.creatorId);
    record.lastCreatorName = def?.name ?? params.creatorId;
  }

  if (params.activityType === "challenge") {
    record.challengesCompletedToday += 1;
  }

  record.updatedAt = new Date().toISOString();
  engagementStore.set(params.userId, record);
  return record;
}

export function getUserEngagement(userId: string): UserDailyEngagement {
  return getOrCreateEngagement(userId);
}

export function buildDailyHub(userId?: string | null) {
  const specialist = getSpecialistOfDay();
  return {
    specialistOfDay: specialist,
    dailyInsight: getDailyInsight(specialist.creatorId),
    dailyChallenge: getDailyChallenge(specialist.creatorId),
    engagement: userId ? getUserEngagement(userId) : null,
    features: [
      { id: "hive", title: "AI Hive", description: "45 specialists collaborate on complex problems.", emoji: "🐝" },
      { id: "learn", title: "Learn the Trade", description: "Lessons, practice, cert prep, on-the-job training.", emoji: "📚" },
      { id: "streak", title: "Daily Streaks", description: "Chat or learn daily to build your streak.", emoji: "🔥" },
      { id: "3d", title: "3D Workspace", description: "Design, print, and collaborate with trade AIs.", emoji: "🎮" },
    ],
  };
}
