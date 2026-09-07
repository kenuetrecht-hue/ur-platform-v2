/**
 * Music Studio — beats, lyrics, and the existing Musician / Songwriter desks.
 * Not a new AI persona. Not Suno/Udio. Not Pro Tools.
 */

export const MUSIC_STUDIO_HREF = "/music-studio" as const;
export const MUSIC_STUDIO_TITLE = "Music Studio";
export const MUSIC_STUDIO_RULE =
  "UR Music Studio is our own web/app room: two decks, cue, metronome, beat grid, lyrics, Musician + Songwriter, and optional UR Studio Pro. Hookups are files and OS dialogs you start (print, MIDI, WAV, USB deck, your audio interface) — not Avid Pro Tools, Ableton, Serato, or a Suno hit-song generator.";

export const MUSIC_TRACKS_FREE = ["kick", "snare", "hat", "bass"] as const;
export const MUSIC_TRACKS = ["kick", "snare", "hat", "bass", "clap", "perc", "pad", "lead"] as const;
export const MUSIC_STEPS_FREE = 16;
export const MUSIC_STEPS = 32;
export const MUSIC_KITS = ["hiphop", "house", "rock", "latin"] as const;
export const MUSIC_KEYS = ["C", "D", "E", "F", "G", "A", "Bb"] as const;

export const MUSIC_TITLE_MAX = 80;
export const MUSIC_LYRICS_MAX = 4000;
export const MUSIC_NOTES_MAX = 500;
export const MUSIC_BPM_MIN = 60;
export const MUSIC_BPM_MAX = 180;

export type MusicTrackId = (typeof MUSIC_TRACKS)[number];
export type MusicKitId = (typeof MUSIC_KITS)[number];
export type MusicKeyId = (typeof MUSIC_KEYS)[number];
export type MusicDeckId = "a" | "b";
export type MusicPattern = Record<MusicTrackId, boolean[]>;

export type MusicMixerChannel = {
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
};

export type MusicFx = {
  reverb: number;
  delay: number;
  filter: number;
};

export type MusicMixer = Record<MusicTrackId, MusicMixerChannel>;

export type MusicProject = {
  id: string;
  userId: string;
  title: string;
  bpm: number;
  kit: MusicKitId;
  key: MusicKeyId;
  pattern: MusicPattern;
  patternB: MusicPattern;
  crossfade: number;
  cueStepA: number;
  cueStepB: number;
  mixer: MusicMixer;
  fx: MusicFx;
  bars: 1 | 2 | 4;
  lyrics: string;
  notes: string;
  joinCode: string;
  collaboratorIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PublicMusicProject = Omit<MusicProject, "userId"> & {
  owner: boolean;
};

export function defaultMusicMixerChannel(): MusicMixerChannel {
  return { volume: 80, pan: 0, mute: false, solo: false };
}

export function emptyMusicMixer(): MusicMixer {
  return {
    kick: defaultMusicMixerChannel(),
    snare: defaultMusicMixerChannel(),
    hat: { ...defaultMusicMixerChannel(), volume: 55 },
    bass: defaultMusicMixerChannel(),
    clap: { ...defaultMusicMixerChannel(), volume: 70 },
    perc: { ...defaultMusicMixerChannel(), volume: 60 },
    pad: { ...defaultMusicMixerChannel(), volume: 45, pan: -20 },
    lead: { ...defaultMusicMixerChannel(), volume: 65, pan: 20 },
  };
}

export function emptyMusicFx(): MusicFx {
  return { reverb: 12, delay: 0, filter: 100 };
}

export function emptyMusicPattern(): MusicPattern {
  return {
    kick: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 4 === 0),
    snare: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 4 === 2),
    hat: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 2 === 0),
    bass: Array.from({ length: MUSIC_STEPS }, (_, i) => i === 0 || i === 6 || i === 10),
    clap: Array.from({ length: MUSIC_STEPS }, (_, i) => i === 4 || i === 12 || i === 20 || i === 28),
    perc: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 8 === 3),
    pad: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 8 === 0),
    lead: Array.from({ length: MUSIC_STEPS }, (_, i) => i === 8 || i === 24),
  };
}

/** Complementary loop for deck B so the booth has two parts out of the box. */
export function emptyDeckBPattern(): MusicPattern {
  return {
    kick: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 8 === 4),
    snare: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 8 === 0),
    hat: Array.from({ length: MUSIC_STEPS }, () => true),
    bass: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 16 === 8),
    clap: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 4 === 2),
    perc: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 8 === 6),
    pad: Array.from({ length: MUSIC_STEPS }, (_, i) => i % 16 === 0),
    lead: Array.from({ length: MUSIC_STEPS }, (_, i) => i === 12 || i === 28),
  };
}

export function clampCrossfade(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function clampCueStep(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MUSIC_STEPS - 1, Math.max(0, Math.round(value)));
}

/** Equal-power A/B mix. 0 = deck A, 100 = deck B. */
export function crossfadeGains(crossfade: number): { a: number; b: number } {
  const t = clampCrossfade(crossfade) / 100;
  return {
    a: Math.cos((t * Math.PI) / 2),
    b: Math.sin((t * Math.PI) / 2),
  };
}

export function isMetronomeClick(step: number): boolean {
  return step % 4 === 0;
}

export function isMetronomeAccent(step: number): boolean {
  return step % 16 === 0;
}

export function clampMixerVolume(value: number): number {
  if (!Number.isFinite(value)) return 80;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function clampMixerPan(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(-100, Math.round(value)));
}

export function clampFx(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function visibleMusicTracks(hasPro: boolean): readonly MusicTrackId[] {
  return hasPro ? MUSIC_TRACKS : MUSIC_TRACKS_FREE;
}

export function visibleMusicSteps(hasPro: boolean): number {
  return hasPro ? MUSIC_STEPS : MUSIC_STEPS_FREE;
}

export function isMusicKitId(value: string): value is MusicKitId {
  return (MUSIC_KITS as readonly string[]).includes(value);
}

export function isMusicKeyId(value: string): value is MusicKeyId {
  return (MUSIC_KEYS as readonly string[]).includes(value);
}

export function clampMusicBpm(value: number): number {
  if (!Number.isFinite(value)) return 90;
  return Math.min(MUSIC_BPM_MAX, Math.max(MUSIC_BPM_MIN, Math.round(value)));
}

export function toggleMusicStep(pattern: MusicPattern, track: MusicTrackId, step: number): MusicPattern {
  if (step < 0 || step >= MUSIC_STEPS) return pattern;
  const next = pattern[track].map((on, i) => (i === step ? !on : on));
  return { ...pattern, [track]: next };
}

export function countActiveHits(pattern: MusicPattern): number {
  return MUSIC_TRACKS.reduce((sum, track) => sum + pattern[track].filter(Boolean).length, 0);
}

/** Common pop/hip-hop progressions in the chosen key — theory, not generated audio. */
export function suggestChordProgressions(key: MusicKeyId): string[] {
  const map: Record<MusicKeyId, string[]> = {
    C: ["C – G – Am – F", "C – Am – F – G", "Am – F – C – G"],
    D: ["D – A – Bm – G", "D – Bm – G – A", "Bm – G – D – A"],
    E: ["E – B – C#m – A", "E – C#m – A – B", "C#m – A – E – B"],
    F: ["F – C – Dm – Bb", "F – Dm – Bb – C", "Dm – Bb – F – C"],
    G: ["G – D – Em – C", "G – Em – C – D", "Em – C – G – D"],
    A: ["A – E – F#m – D", "A – F#m – D – E", "F#m – D – A – E"],
    Bb: ["Bb – F – Gm – Eb", "Bb – Gm – Eb – F", "Gm – Eb – Bb – F"],
  };
  return map[key];
}

export function musicianCoachPrompt(project: Pick<MusicProject, "title" | "bpm" | "kit" | "key">): string {
  return (
    `I'm in UR Music Studio on "${project.title}". ` +
    `Kit ${project.kit}, ${project.bpm} BPM, key of ${project.key}. ` +
    `Teach me this booth (turntables, cue, metronome, two decks, grid) and how to practice the beat on my instrument. ` +
    `Do not pretend this is Serato, Ableton, or Pro Tools.`
  );
}

export function songwriterCoachPrompt(project: Pick<MusicProject, "title" | "bpm" | "kit" | "key" | "lyrics">): string {
  const lyricBit = project.lyrics.trim()
    ? `Here are my lyrics so far:\n${project.lyrics.trim().slice(0, 800)}`
    : "I do not have lyrics yet.";
  return (
    `I'm in UR Music Studio on "${project.title}". ` +
    `Kit ${project.kit}, ${project.bpm} BPM, key of ${project.key}. ` +
    `${lyricBit} Help me write or tighten MY song — hook, verses, and structure. ` +
    `Coach me; do not paste a famous artist's lyrics or a finished commercial hit.`
  );
}

export function publicMusicProject(project: MusicProject, viewerId: string): PublicMusicProject {
  const { userId, ...rest } = project;
  return { ...rest, owner: userId === viewerId };
}
