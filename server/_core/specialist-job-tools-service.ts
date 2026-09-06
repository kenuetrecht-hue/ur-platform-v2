/**
 * Server-side specialist job tools — read-only GitHub, public law search, story bibles, shop send.
 * Security: ctx.user.id ownership, sanitized queries, no GitHub push, CNC never auto-starts.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  assertShopSendNeverAutoStarts,
  buildCourtListenerSearchUrl,
  buildGovinfoSearchUrl,
  buildPrintableHtml,
  buildUnifiedDiff,
  CNC_USER_STARTS_REMINDER,
  compareDocuments,
  EDUCATIONAL_DRAFT_STAMP,
  expandChapterFromBible,
  findUsState,
  formatFountain,
  inspectShopExport,
  isBlockedGithubImportPath,
  markupContract,
  NOT_YOUR_LAWYER_STAMP,
  parsePublicGithubRepoUrl,
  sanitizePublicSearchQuery,
  scoreSpokenDrill,
  suggestRhymes,
  type StoryBibleChapter,
  type StoryBibleCharacter,
  type StoryBibleDraft,
  type StoryBibleLocation,
} from "../../lib/specialist-job-tools";
import { applyForgePatches, buildPatchDiffs, type ForgeFilePatch } from "./forge-patch-service";
import { getSandboxProject, runSandboxTest, saveSandboxFile } from "./coder-sandbox-service";
import { getGameSandboxProject, runGameSandboxTest, saveGameSandboxFile } from "./game-dev-sandbox-service";
import { sendFileToPrinter } from "./equipment-service";
import { sanitizeUserText } from "./input-sanitize";

const FETCH_MS = 8000;
const MAX_IMPORT_FILES = 40;
const MAX_IMPORT_FILE_BYTES = 200_000;
const MAX_BIBLES_PER_USER = 8;

export type ForgeToolSpecialist = "coder" | "game";

type StoryBibleRecord = StoryBibleDraft & {
  id: string;
  userId: string;
  creatorId: string;
  updatedAt: string;
};

const storyBibles = new Map<string, StoryBibleRecord>();

function bibleKey(userId: string, bibleId: string): string {
  return `${userId}:${bibleId}`;
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ur-platform-readonly-tools",
      ...headers,
    },
    signal: AbortSignal.timeout(FETCH_MS),
  });
  if (!res.ok) {
    throw new TRPCError({
      code: res.status === 404 ? "NOT_FOUND" : "BAD_REQUEST",
      message:
        res.status === 403 || res.status === 429
          ? "Public lookup is rate-limited right now. Try again later."
          : `Lookup failed (${res.status}).`,
    });
  }
  return res.json();
}

export function previewSandboxDiffs(params: {
  specialist: ForgeToolSpecialist;
  files: Array<{ path: string; content: string }>;
  patches: ForgeFilePatch[];
}) {
  const project = {
    id: "preview",
    userId: "",
    name: "preview",
    description: "",
    framework: "",
    files: params.files.map((f) => ({
      path: f.path,
      content: f.content,
      language: "text",
      sizeBytes: f.content.length,
      updatedAt: "",
    })),
    createdAt: "",
    updatedAt: "",
  };
  const diffs = buildPatchDiffs(project, params.patches);
  return {
    diffs: diffs.map((d) => ({
      ...d,
      unified: buildUnifiedDiff(d.path, d.before, d.after).unified,
    })),
    stamp: "Review the diff, then run the test loop. Nothing deploys from this step.",
  };
}

export async function runSandboxTestLoop(params: {
  specialist: ForgeToolSpecialist;
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  patches?: ForgeFilePatch[];
}) {
  if (params.patches?.length) {
    await applyForgePatches({
      specialist: params.specialist,
      userId: params.userId,
      isPlatformOwner: params.isPlatformOwner,
      projectId: params.projectId,
      patches: params.patches.slice(0, 20),
    });
  }

  const project =
    params.specialist === "game"
      ? await getGameSandboxProject(params.userId, params.isPlatformOwner, params.projectId)
      : await getSandboxProject(params.userId, params.isPlatformOwner, params.projectId);

  const test =
    params.specialist === "game"
      ? await runGameSandboxTest({
          userId: params.userId,
          isPlatformOwner: params.isPlatformOwner,
          projectId: params.projectId,
        })
      : await runSandboxTest({
          userId: params.userId,
          isPlatformOwner: params.isPlatformOwner,
          projectId: params.projectId,
        });

  return {
    projectId: params.projectId,
    fileCount: project.files.length,
    test,
    loop: "diff → apply → structure test. This is not an unrestricted shell and not a production deploy.",
  };
}

export async function importPublicGithubRepo(params: {
  specialist: ForgeToolSpecialist;
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  repoUrl: string;
}): Promise<{ owner: string; repo: string; imported: string[]; skipped: string[]; privateRepo: false }> {
  const { owner, repo } = parsePublicGithubRepoUrl(params.repoUrl);

  const meta = (await fetchJson(`https://api.github.com/repos/${owner}/${repo}`, {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  })) as { private?: boolean; default_branch?: string };

  if (meta.private) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only public repositories can be imported. Private repos stay off this path.",
    });
  }

  const tree = (await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(meta.default_branch || "main")}?recursive=1`,
    {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  )) as { tree?: Array<{ path?: string; type?: string; size?: number; url?: string; sha?: string }> };

  const blobs = (tree.tree ?? []).filter(
    (n) =>
      n.type === "blob" &&
      n.path &&
      !isBlockedGithubImportPath(n.path) &&
      (n.size ?? 0) > 0 &&
      (n.size ?? 0) <= MAX_IMPORT_FILE_BYTES,
  );

  const imported: string[] = [];
  const skipped: string[] = [];
  const save = params.specialist === "game" ? saveGameSandboxFile : saveSandboxFile;

  for (const blob of blobs.slice(0, MAX_IMPORT_FILES)) {
    const path = blob.path!;
    if (isBlockedGithubImportPath(path)) {
      skipped.push(path);
      continue;
    }
    try {
      const encodedPath = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
      const file = (await fetchJson(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      })) as { encoding?: string; content?: string; type?: string };

      if (file.type !== "file" || file.encoding !== "base64" || !file.content) {
        skipped.push(path);
        continue;
      }
      const content = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
      if (content.includes("\u0000")) {
        skipped.push(path);
        continue;
      }
      await save({
        userId: params.userId,
        isPlatformOwner: params.isPlatformOwner,
        projectId: params.projectId,
        path,
        content: content.slice(0, 500_000),
        persistToCloud: true,
      });
      imported.push(path);
    } catch {
      skipped.push(path);
    }
  }

  if (imported.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No safe public files could be imported (empty repo, blocked paths, or rate limit).",
    });
  }

  return { owner, repo, imported, skipped: skipped.slice(0, 30), privateRepo: false };
}

type CourtListenerResult = {
  title: string;
  court?: string;
  date?: string;
  url?: string;
};

export async function searchPublicLaw(params: { query: string; stateCode?: string }) {
  const query = sanitizePublicSearchQuery(sanitizeUserText(params.query, 180));
  if (query.length < 2) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a short research question." });
  }
  const state = params.stateCode ? findUsState(params.stateCode) : null;
  if (params.stateCode && !state) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a valid US state or DC." });
  }

  const courtListenerUrl = buildCourtListenerSearchUrl({ query, stateCode: state?.code });
  const govinfoUrl = buildGovinfoSearchUrl({ query, stateCode: state?.code });

  let results: CourtListenerResult[] = [];
  try {
    const data = (await fetchJson(courtListenerUrl)) as {
      results?: Array<{ caseName?: string; court?: string; dateFiled?: string; absolute_url?: string }>;
    };
    results = (data.results ?? []).slice(0, 8).map((row) => ({
      title: sanitizeUserText(row.caseName ?? "Untitled opinion", 200),
      court: row.court ? sanitizeUserText(String(row.court), 80) : undefined,
      date: row.dateFiled,
      url:
        row.absolute_url && row.absolute_url.startsWith("/") && !row.absolute_url.startsWith("//")
          ? `https://www.courtlistener.com${row.absolute_url}`
          : undefined,
    }));
  } catch {
    results = [];
  }

  return {
    state,
    query,
    results,
    sources: {
      courtListener: courtListenerUrl,
      govinfo: govinfoUrl,
    },
    stamp: NOT_YOUR_LAWYER_STAMP,
    note: "Public CourtListener opinions and a govinfo search link. Not Westlaw. Not e-filing. Not your lawyer.",
  };
}

export function reviewContractMarkup(text: string) {
  const body = sanitizeUserText(text, 20_000);
  return {
    ...markupContract(body),
    characterCount: body.length,
  };
}

export function reviewDocumentCompare(left: string, right: string) {
  return compareDocuments(sanitizeUserText(left, 20_000), sanitizeUserText(right, 20_000));
}

function clampBible(input: StoryBibleDraft): StoryBibleDraft {
  return {
    title: sanitizeUserText(input.title, 120),
    logline: sanitizeUserText(input.logline, 400),
    characters: (input.characters ?? []).slice(0, 20).map((c: StoryBibleCharacter) => ({
      name: sanitizeUserText(c.name, 80),
      role: sanitizeUserText(c.role, 80),
      notes: sanitizeUserText(c.notes, 400),
    })),
    locations: (input.locations ?? []).slice(0, 20).map((l: StoryBibleLocation) => ({
      name: sanitizeUserText(l.name, 80),
      notes: sanitizeUserText(l.notes, 400),
    })),
    chapters: (input.chapters ?? []).slice(0, 40).map((c: StoryBibleChapter, i) => ({
      id: sanitizeUserText(c.id || `ch-${i + 1}`, 40),
      title: sanitizeUserText(c.title, 120),
      summary: sanitizeUserText(c.summary, 800),
    })),
  };
}

export function upsertStoryBible(params: {
  userId: string;
  creatorId: string;
  bibleId?: string;
  draft: StoryBibleDraft;
}): StoryBibleRecord {
  const owned = [...storyBibles.values()].filter((b) => b.userId === params.userId);
  const id = params.bibleId?.trim() || randomUUID();
  const existing = storyBibles.get(bibleKey(params.userId, id));
  if (!existing && owned.length >= MAX_BIBLES_PER_USER) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Story bible limit reached (8)." });
  }
  const record: StoryBibleRecord = {
    id,
    userId: params.userId,
    creatorId: params.creatorId,
    ...clampBible(params.draft),
    updatedAt: new Date().toISOString(),
  };
  storyBibles.set(bibleKey(params.userId, id), record);
  return record;
}

export function listStoryBibles(userId: string, creatorId: string): StoryBibleRecord[] {
  return [...storyBibles.values()].filter((b) => b.userId === userId && b.creatorId === creatorId);
}

export function getOwnedStoryBible(userId: string, bibleId: string): StoryBibleRecord {
  const record = storyBibles.get(bibleKey(userId, bibleId));
  if (!record) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Story bible not found." });
  }
  return record;
}

export function expandOwnedChapter(userId: string, bibleId: string, chapterId: string) {
  const bible = getOwnedStoryBible(userId, bibleId);
  return expandChapterFromBible(bible, sanitizeUserText(chapterId, 40));
}

export function layoutFountain(source: string) {
  return formatFountain(sanitizeUserText(source, 20_000));
}

export function rhymeHelp(word: string) {
  return suggestRhymes(sanitizeUserText(word, 40));
}

export function printableDraft(params: { title: string; body: string; legal: boolean; creatorName?: string }) {
  const stamp = params.legal ? NOT_YOUR_LAWYER_STAMP : EDUCATIONAL_DRAFT_STAMP;
  return {
    html: buildPrintableHtml({
      title: sanitizeUserText(params.title, 120),
      body: sanitizeUserText(params.body, 40_000),
      stamp,
      creatorName: params.creatorName,
    }),
    stamp,
  };
}

export function checkShopExport(fileName: string, contentBase64: string) {
  return inspectShopExport(sanitizeUserText(fileName, 255), contentBase64.trim().slice(0, 16_000_000));
}

export async function sendShopFileUserMustStart(params: {
  userId: string;
  connectionId: string;
  fileName: string;
  fileContentBase64: string;
  startPrint?: boolean;
}) {
  assertShopSendNeverAutoStarts(params.startPrint);
  const sent = await sendFileToPrinter({
    userId: params.userId,
    connectionId: params.connectionId,
    fileName: sanitizeUserText(params.fileName, 255),
    fileContentBase64: params.fileContentBase64.trim().slice(0, 12_000_000),
    startPrint: false,
  });
  return {
    ...sent,
    printStarted: false,
    userMustStart: true as const,
    reminder: CNC_USER_STARTS_REMINDER,
  };
}

export function scoreOwnedSpokenDrill(expected: string, transcript: string) {
  return scoreSpokenDrill(sanitizeUserText(expected, 400), sanitizeUserText(transcript, 400));
}

/** Test helper — do not export from the router. */
export function _resetStoryBiblesForTests(): void {
  storyBibles.clear();
}
