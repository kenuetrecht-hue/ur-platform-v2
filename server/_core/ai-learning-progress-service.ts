import { randomUUID } from "crypto";
import type { LearningLevel } from "./ai-learning-mode";

export type LearningProgressRecord = {
  userId: string;
  creatorId: string;
  level: LearningLevel;
  completedTopics: string[];
  lessonsCompleted: number;
  practiceSessions: number;
  lastTopic?: string;
  lastMode?: string;
  updatedAt: string;
  createdAt: string;
};

const progressStore = new Map<string, LearningProgressRecord>();

function storeKey(userId: string, creatorId: string): string {
  return `${userId}:${creatorId}`;
}

export function getLearningProgress(
  userId: string,
  creatorId: string,
): LearningProgressRecord {
  const existing = progressStore.get(storeKey(userId, creatorId));
  if (existing) return existing;

  const now = new Date().toISOString();
  const record: LearningProgressRecord = {
    userId,
    creatorId,
    level: "beginner",
    completedTopics: [],
    lessonsCompleted: 0,
    practiceSessions: 0,
    createdAt: now,
    updatedAt: now,
  };
  progressStore.set(storeKey(userId, creatorId), record);
  return record;
}

export function updateLearningProgress(
  userId: string,
  creatorId: string,
  patch: Partial<
    Pick<
      LearningProgressRecord,
      "level" | "completedTopics" | "lessonsCompleted" | "practiceSessions" | "lastTopic" | "lastMode"
    >
  >,
): LearningProgressRecord {
  const record = getLearningProgress(userId, creatorId);
  Object.assign(record, patch, { updatedAt: new Date().toISOString() });
  progressStore.set(storeKey(userId, creatorId), record);
  return record;
}

export function recordLessonComplete(
  userId: string,
  creatorId: string,
  topic: string,
  mode: string,
): LearningProgressRecord {
  const record = getLearningProgress(userId, creatorId);
  if (!record.completedTopics.includes(topic)) {
    record.completedTopics.push(topic);
  }
  record.lessonsCompleted += 1;
  record.lastTopic = topic;
  record.lastMode = mode;
  record.updatedAt = new Date().toISOString();
  if (mode === "practice") {
    record.practiceSessions += 1;
  }
  progressStore.set(storeKey(userId, creatorId), record);
  return record;
}

export function createPracticeQuestionSet(
  creatorName: string,
  topics: string[],
  count: number,
): Array<{ id: string; question: string; topic: string }> {
  const selected = topics.slice(0, count);
  return selected.map((topic, i) => ({
    id: `pq-${randomUUID().slice(0, 8)}`,
    topic,
    question: `[${creatorName}] Practice ${i + 1}: Explain ${topic} as if teaching a new apprentice. What are the 3 most important things to remember?`,
  }));
}
