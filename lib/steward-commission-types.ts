/** Owner-only work Steward assigns to public specialists for UR Platform catalog. */

export const STEWARD_WORK_KINDS = [
  "song",
  "ebook",
  "audiobook_script",
  "video_script",
  "lesson",
] as const;

export type StewardWorkKind = (typeof STEWARD_WORK_KINDS)[number];

export const STEWARD_WORK_CREW = [
  "ai-songwriter-001",
  "ai-author-001",
  "ai-poet-001",
  "ai-musician-001",
  "ai-content-helper-001",
  "contentmate",
  "ai-creative-001",
  "ai-marketing-001",
] as const;

export const STEWARD_KIND_SPECIALIST: Record<StewardWorkKind, string> = {
  song: "ai-songwriter-001",
  ebook: "ai-author-001",
  audiobook_script: "ai-author-001",
  video_script: "ai-content-helper-001",
  lesson: "contentmate",
};

export const STEWARD_KIND_LABEL: Record<StewardWorkKind, string> = {
  song: "Song for UR Platform",
  ebook: "Educational ebook",
  audiobook_script: "Audiobook / narration script",
  video_script: "Educational video script",
  lesson: "Educational lesson",
};

export function isStewardWorkKind(value: string): value is StewardWorkKind {
  return (STEWARD_WORK_KINDS as readonly string[]).includes(value);
}
