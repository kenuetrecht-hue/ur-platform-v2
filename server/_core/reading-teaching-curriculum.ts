/**
 * Reading AI — systematic phonics and literacy in many writing systems.
 * Not a clone of any trademarked reading program.
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export const READING_AI_ID = "ai-reading-001";

const READING_MODULES: Omit<LearningModule, "id">[] = [
  { title: "Sounds first", description: "Phonemes — hear the sound before the letter." },
  { title: "Letters and marks", description: "Graphemes in the learner's script." },
  { title: "Blend and segment", description: "Build words from sounds; pull words apart." },
  { title: "Decodable sentences", description: "Read only what you have been taught so far." },
  { title: "Sight words (carefully)", description: "High-frequency words after phonics, not instead of it." },
  { title: "Fluency", description: "Smooth reading aloud without racing." },
  { title: "Comprehension", description: "What did that sentence mean?" },
  { title: "Other scripts", description: "Arabic, Devanagari, Hangul, Hanzi/Kanji/Kana — start from sound." },
  { title: "Adult literacy", description: "Respectful lessons for grown-ups who are starting fresh." },
  { title: "Print a worksheet", description: "Send a short decodable page to the user's printer." },
  { title: "Hand off to LinguaMate", description: "Speaking and conversation after reading is underway." },
  { title: "Literacy path check", description: "Study plan only — not a diagnosis of dyslexia.", certificationPrep: true },
];

export function isReadingTeachingCreator(creatorId: string): boolean {
  return creatorId === READING_AI_ID;
}

export function getReadingTeachingModules(): LearningModule[] {
  return READING_MODULES.map((item, index) => ({ id: `read-mod-${index + 1}`, ...item }));
}

export function getReadingSelfPacedPath(level: LearningLevel) {
  const paths = {
    beginner: [
      { order: 1, title: "Hear the sound", description: "Phonemes only.", estimatedMinutes: 15, moduleTitle: "Sounds first" },
      { order: 2, title: "Match a letter", description: "One grapheme.", estimatedMinutes: 20, moduleTitle: "Letters and marks" },
      { order: 3, title: "Blend three sounds", description: "First CVC word.", estimatedMinutes: 25, moduleTitle: "Blend and segment" },
      { order: 4, title: "Read a tiny sentence", description: "Decodable only.", estimatedMinutes: 20, moduleTitle: "Decodable sentences" },
    ],
    intermediate: [
      { order: 1, title: "Longer words", description: "Blends and digraphs.", estimatedMinutes: 30, moduleTitle: "Blend and segment" },
      { order: 2, title: "Read aloud smoothly", description: "Fluency, not speed contests.", estimatedMinutes: 25, moduleTitle: "Fluency" },
      { order: 3, title: "Say what it meant", description: "Comprehension.", estimatedMinutes: 25, moduleTitle: "Comprehension" },
    ],
    advanced: [
      { order: 1, title: "A second script", description: "Start another writing system from sound.", estimatedMinutes: 40, moduleTitle: "Other scripts" },
      { order: 2, title: "Adult chapter", description: "Dignity-first literacy.", estimatedMinutes: 35, moduleTitle: "Adult literacy" },
      { order: 3, title: "Print and practice", description: "Worksheet to the printer.", estimatedMinutes: 20, moduleTitle: "Print a worksheet" },
    ],
  } as const;
  return [...paths[level]];
}

export function buildReadingTeachingPromptAddition(level: LearningLevel, mode: LearningMode, topic?: string): string {
  return `
READING AI — LITERACY AND SYSTEMATIC PHONICS TEACHER
Teach people to read: sounds → letters/marks → blending → decodable text. Any language and script the user names.
Do not copy or brand a commercial reading program. Do not diagnose dyslexia or other learning disabilities.
LinguaMate teaches speaking and conversation; you teach reading and writing the marks. Hand off speaking practice to LinguaMate.
Offer printable worksheets when the user can print. Keep type large. Celebrate small wins.
Level: ${level} | Mode: ${mode} | Topic: ${topic ?? "Sounds first"}`.trim();
}
