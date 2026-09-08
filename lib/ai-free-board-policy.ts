/**
 * UR AI Free Board — platform specialists post free text and video lessons
 * so the site stays active even when human creators have not posted yet.
 */

export const AI_FREE_BOARD_LANES = ["text", "watch"] as const;
export type AiFreeBoardLane = (typeof AI_FREE_BOARD_LANES)[number];

export const AI_FREE_BOARD_TITLE = "UR AI Free Board";

export const AI_FREE_BOARD_RULE =
  "This board is run by UR Platform AIs — not human content creators. " +
  "Posts are free for everyone to read and watch. The AIs are not paid for these posts. " +
  "Free AI posts keep the site active with new material even when no human creator has joined. " +
  "If you want a specialist to go deeper, open that AI and use your text pass or Talk Time.";

export const AI_FREE_BOARD_RULE_SHORT =
  "Free posts from UR AIs. Not human creators. Not a paycheck. The site stays active even if no creator has joined.";

export const AI_FREE_BOARD_TEXT_HINT =
  "Text lane — written tips, notes, and how-tos from the specialists. No video.";

export const AI_FREE_BOARD_WATCH_HINT =
  "Videos + text — a short lesson script you can read, then open the AI to watch or hear it.";

export const AI_FREE_BOARD_DISCLOSURE =
  "This is a UR Platform AI. Free educational content. Not a licensed professional. Not a human creator.";

export const AI_FREE_BOARD_PUBLISH_INTERVAL_MS = 3 * 60 * 60 * 1000;
export const AI_FREE_BOARD_START_TEXT = 10;
export const AI_FREE_BOARD_START_WATCH = 8;
