/**
 * Music Studio projects — owner + join-code collaborators.
 * In-memory first studio (same pattern as early Cartoon Studio).
 */

import { randomBytes, randomUUID } from "crypto";
import {
  clampFx,
  clampMixerPan,
  clampMixerVolume,
  clampMusicBpm,
  emptyMusicFx,
  emptyMusicMixer,
  emptyMusicPattern,
  isMusicKeyId,
  isMusicKitId,
  MUSIC_NOTES_MAX,
  MUSIC_STEPS,
  MUSIC_TITLE_MAX,
  MUSIC_TRACKS,
  MUSIC_LYRICS_MAX,
  publicMusicProject,
  type MusicFx,
  type MusicKeyId,
  type MusicKitId,
  type MusicMixer,
  type MusicPattern,
  type MusicProject,
  type PublicMusicProject,
} from "../../lib/music-studio";
import { RESOURCE_NOT_FOUND, sanitizeUserText } from "./input-sanitize";

const projects = new Map<string, MusicProject>();
const joinIndex = new Map<string, string>();
const MAX_PROJECTS_PER_USER = 20;
const MAX_COLLABORATORS = 8;

export function _resetMusicStudioForTests(): void {
  projects.clear();
  joinIndex.clear();
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  if (joinIndex.has(code)) return makeJoinCode();
  return code;
}

function canAccess(project: MusicProject, userId: string): boolean {
  return project.userId === userId || project.collaboratorIds.includes(userId);
}

function requireProject(projectId: string, userId: string): MusicProject {
  const project = projects.get(projectId);
  if (!project || !canAccess(project, userId)) {
    throw new Error(RESOURCE_NOT_FOUND);
  }
  return project;
}

function normalizePattern(pattern: MusicPattern): MusicPattern {
  const next = emptyMusicPattern();
  for (const track of MUSIC_TRACKS) {
    const row = pattern[track] ?? [];
    next[track] = Array.from({ length: MUSIC_STEPS }, (_, i) => Boolean(row[i]));
  }
  return next;
}

export function listMusicProjects(userId: string): PublicMusicProject[] {
  return [...projects.values()]
    .filter((project) => canAccess(project, userId))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((project) => publicMusicProject(project, userId));
}

export function getMusicProject(projectId: string, userId: string): PublicMusicProject {
  return publicMusicProject(requireProject(projectId, userId), userId);
}

export function createMusicProject(input: {
  userId: string;
  title?: string;
}): PublicMusicProject {
  const owned = [...projects.values()].filter((p) => p.userId === input.userId);
  if (owned.length >= MAX_PROJECTS_PER_USER) {
    const oldest = owned.sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))[0];
    if (oldest) {
      projects.delete(oldest.id);
      joinIndex.delete(oldest.joinCode);
    }
  }

  const joinCode = makeJoinCode();
  const stamp = nowIso();
  const project: MusicProject = {
    id: randomUUID(),
    userId: input.userId,
    title: sanitizeUserText(input.title || "Untitled beat", MUSIC_TITLE_MAX) || "Untitled beat",
    bpm: 90,
    kit: "hiphop",
    key: "C",
    pattern: emptyMusicPattern(),
    mixer: emptyMusicMixer(),
    fx: emptyMusicFx(),
    bars: 2,
    lyrics: "",
    notes: "",
    joinCode,
    collaboratorIds: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  projects.set(project.id, project);
  joinIndex.set(joinCode, project.id);
  return publicMusicProject(project, input.userId);
}

export function saveMusicProject(input: {
  userId: string;
  projectId: string;
  title?: string;
  bpm?: number;
  kit?: string;
  key?: string;
  pattern?: MusicPattern;
  mixer?: MusicMixer;
  fx?: MusicFx;
  bars?: 1 | 2 | 4;
  lyrics?: string;
  notes?: string;
}): PublicMusicProject {
  const project = requireProject(input.projectId, input.userId);
  if (input.title !== undefined) {
    project.title = sanitizeUserText(input.title, MUSIC_TITLE_MAX) || project.title;
  }
  if (input.bpm !== undefined) {
    project.bpm = clampMusicBpm(input.bpm);
  }
  if (input.kit !== undefined && isMusicKitId(input.kit)) {
    project.kit = input.kit as MusicKitId;
  }
  if (input.key !== undefined && isMusicKeyId(input.key)) {
    project.key = input.key as MusicKeyId;
  }
  if (input.pattern) {
    project.pattern = normalizePattern(input.pattern);
  }
  if (input.mixer) {
    const mixer = emptyMusicMixer();
    for (const track of MUSIC_TRACKS) {
      const ch = input.mixer[track];
      if (!ch) continue;
      mixer[track] = {
        volume: clampMixerVolume(ch.volume),
        pan: clampMixerPan(ch.pan),
        mute: Boolean(ch.mute),
        solo: Boolean(ch.solo),
      };
    }
    project.mixer = mixer;
  }
  if (input.fx) {
    project.fx = {
      reverb: clampFx(input.fx.reverb),
      delay: clampFx(input.fx.delay),
      filter: clampFx(input.fx.filter),
    };
  }
  if (input.bars === 1 || input.bars === 2 || input.bars === 4) {
    project.bars = input.bars;
  }
  if (input.lyrics !== undefined) {
    project.lyrics = sanitizeUserText(input.lyrics, MUSIC_LYRICS_MAX);
  }
  if (input.notes !== undefined) {
    project.notes = sanitizeUserText(input.notes, MUSIC_NOTES_MAX);
  }
  project.updatedAt = nowIso();
  return publicMusicProject(project, input.userId);
}

export function joinMusicProject(input: {
  userId: string;
  joinCode: string;
}): PublicMusicProject {
  const code = sanitizeUserText(input.joinCode, 8).toUpperCase();
  const projectId = joinIndex.get(code);
  const project = projectId ? projects.get(projectId) : undefined;
  if (!project) throw new Error(RESOURCE_NOT_FOUND);
  if (project.userId !== input.userId && !project.collaboratorIds.includes(input.userId)) {
    if (project.collaboratorIds.length >= MAX_COLLABORATORS) {
      throw new Error(RESOURCE_NOT_FOUND);
    }
    project.collaboratorIds.push(input.userId);
    project.updatedAt = nowIso();
  }
  return publicMusicProject(project, input.userId);
}
