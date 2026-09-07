/**
 * Creative & writing specialists — full Learn tab curriculum (lesson, practice, cert prep, on-the-job).
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export type CreativeExercise = {
  id: string;
  title: string;
  level: LearningLevel;
  topic: string;
  prompt: string;
};

export type SelfPacedStep = {
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  moduleTitle: string;
};

export const CREATIVE_TEACHING_CREATOR_IDS = new Set([
  "ai-author-001",
  "ai-poet-001",
  "ai-songwriter-001",
  "ai-logo-brand-001",
  "ai-musician-001",
  "ai-creative-001",
]);

const MODULES_BY_CREATOR: Record<string, Omit<LearningModule, "id">[]> = {
  "ai-author-001": [
    { title: "Story ideas that stick", description: "Find your premise, theme, and reader promise." },
    { title: "Three-act structure", description: "Setup, confrontation, resolution — for any genre." },
    { title: "Characters readers remember", description: "Goals, flaws, arcs, and voice on the page." },
    { title: "World-building without info-dumps", description: "Setting, rules, and sensory detail woven in." },
    { title: "Chapter pacing & hooks", description: "Openings, cliffhangers, and scene goals." },
    { title: "Dialogue that sounds human", description: "Subtext, rhythm, and character-specific speech." },
    { title: "Revision & self-editing", description: "Cut fluff, sharpen prose, fix plot holes." },
    { title: "Memoir & non-fiction structure", description: "Outline true stories and how-to books." },
    { title: "Query letters & self-publishing", description: "Pitch, platform, and launch basics (educational)." },
    {
      title: "Author craft certification prep",
      description: "Writing workshop and MFA-style study orientation (educational only).",
      certificationPrep: true,
    },
  ],
  "ai-poet-001": [
    { title: "What makes a poem a poem", description: "Line breaks, sound, image, and intention." },
    { title: "Imagery & metaphor", description: "Show don't tell — concrete details that resonate." },
    { title: "Rhythm & meter basics", description: "Syllables, stress, and musicality in free verse." },
    { title: "Haiku & short forms", description: "Brevity, season words, and modern haiku." },
    { title: "Sonnet & formal poetry", description: "Rhyme schemes and volta without feeling stiff." },
    { title: "Spoken word & performance", description: "Stage presence, breath, and audience connection." },
    { title: "Editing your drafts", description: "Kill darlings, tighten lines, sharpen endings." },
    { title: "Building a chapbook", description: "Curate, order, and title a poetry collection." },
    {
      title: "Poetry workshop & contest prep",
      description: "Critique groups and submission orientation (educational).",
      certificationPrep: true,
    },
  ],
  "ai-songwriter-001": [
    { title: "Write lyrics over a Music Studio beat", description: "Hook, verse, and chorus on the UR booth loop — your words, not a famous song." },
    { title: "Song anatomy", description: "Verse, chorus, pre-chorus, bridge, and hook placement." },
    { title: "Lyrics that land", description: "Rhyme, rhythm, storytelling, and singability." },
    { title: "Titles & hooks", description: "Memorable one-liners and emotional core." },
    { title: "Melody concepts", description: "Contour, range, and phrasing (text guidance)." },
    { title: "Chord progressions by genre", description: "Pop, country, rock, hip-hop, worship patterns." },
    { title: "Co-writing sessions", description: "Split roles, feedback, and finishing a draft." },
    { title: "Demo & arrangement notes", description: "Guide producers and home-recording setup." },
    { title: "Copyright & publishing basics", description: "Splits, PROs, and protecting your work (educational)." },
    {
      title: "Songwriting workshop prep",
      description: "Industry showcase and critique orientation (educational).",
      certificationPrep: true,
    },
  ],
  "ai-logo-brand-001": [
    { title: "Brand strategy fundamentals", description: "Audience, positioning, and brand promise." },
    { title: "Logo types & when to use them", description: "Wordmark, lettermark, icon, combination mark." },
    { title: "Color psychology & palettes", description: "Primary, secondary, accessibility, and print vs screen." },
    { title: "Typography for brands", description: "Pairing fonts, hierarchy, and legibility." },
    { title: "Sketching logo concepts", description: "Thumbnail sketches and iteration workflow." },
    { title: "Brand voice & taglines", description: "Tone, messaging, and memorable taglines." },
    { title: "Brand kit deliverables", description: "Logo files, spacing, misuse rules, templates." },
    { title: "Handoff to web & print", description: "Briefs for TechBuilder sites and print vendors." },
    {
      title: "Brand design portfolio prep",
      description: "Case studies and design interview orientation (educational).",
      certificationPrep: true,
    },
  ],
  "ai-musician-001": [
    { title: "UR Music Studio booth", description: "What the room is: two decks, grid, lyrics, hookups you start — not Serato or a hit generator." },
    { title: "Turntables, cue, and the crossfader", description: "Spin, scratch, cue preview, metronome click, and A/B mix on this desk." },
    { title: "Programming a beat on the grid", description: "Kick, snare, hat, bass, counting 16ths, and saving a loop." },
    { title: "How to practice effectively", description: "Routines, metronome habits, and measurable progress." },
    { title: "Reading music notation", description: "Staff, clefs, notes, rests, and time signatures." },
    { title: "Rhythm & timing", description: "Counting, subdivisions, and playing with a beat." },
    { title: "Scales & keys", description: "Major/minor scales, finger patterns, and key signatures." },
    { title: "Chords on your instrument", description: "Triads, progressions, and smooth changes." },
    { title: "Guitar fundamentals", description: "Posture, fretting, strumming, and first songs." },
    { title: "Piano & keyboard basics", description: "Hand position, scales, and two-hand coordination." },
    { title: "Drums & percussion intro", description: "Grip, rudiments, and keeping steady time." },
    { title: "Ear training", description: "Intervals, chords by ear, and transcribing melodies." },
    { title: "Writing music on your instrument", description: "Melody-first and chord-first songwriting." },
    { title: "Performance & recording at home", description: "Mic placement, backing tracks, and stage nerves." },
    {
      title: "Music theory & exam prep orientation",
      description: "ABRSM / school band / conservatory study paths (educational only).",
      certificationPrep: true,
    },
  ],
  "ai-creative-001": [
    { title: "Unlocking creative blocks", description: "Warm-ups, prompts, and low-pressure starts." },
    { title: "Cross-media inspiration", description: "Music, art, writing, and design cross-pollination." },
    { title: "Critique & iteration", description: "Give and receive feedback like a pro." },
    { title: "Creative habits & routines", description: "Daily practice without burnout." },
    {
      title: "Portfolio & showcase prep",
      description: "Present your creative work (educational).",
      certificationPrep: true,
    },
  ],
};

const TAGLINES: Record<string, string> = {
  "ai-author-001": "Learn to write books on your own — structure, draft, revise, and publish.",
  "ai-poet-001": "Learn poetry step by step — forms, imagery, performance, and chapbooks.",
  "ai-songwriter-001": "Learn songwriting on UR Music Studio — lyrics, hooks, and finishing YOUR track.",
  "ai-logo-brand-001": "Learn brand design — logos, color, type, and full brand kits.",
  "ai-musician-001": "Learn the UR Music Studio booth, then instruments — turntables, beats, theory, and practice.",
  "ai-creative-001": "Learn the creative process — inspiration, craft, and finishing work.",
};

const SELF_PACED: Record<string, Record<LearningLevel, SelfPacedStep[]>> = {
  "ai-musician-001": {
    beginner: [
      { order: 1, title: "Walk the booth", description: "Play mix, name Deck A and Deck B, find Save.", estimatedMinutes: 10, moduleTitle: "UR Music Studio booth" },
      { order: 2, title: "Spin a platter", description: "Watch the turntable, then scratch once.", estimatedMinutes: 8, moduleTitle: "Turntables, cue, and the crossfader" },
      { order: 3, title: "Click and cue", description: "Metronome on; Cue A from the downbeat.", estimatedMinutes: 10, moduleTitle: "Turntables, cue, and the crossfader" },
      { order: 4, title: "Program kick and snare", description: "16th-note grid: kicks on 1 and 3, snares on 2 and 4.", estimatedMinutes: 15, moduleTitle: "Programming a beat on the grid" },
      { order: 5, title: "Pick your instrument", description: "Guitar, piano, drums, or voice — set up correctly.", estimatedMinutes: 15, moduleTitle: "How to practice effectively" },
      { order: 6, title: "Read your first notes", description: "Staff, note names, and quarter notes.", estimatedMinutes: 25, moduleTitle: "Reading music notation" },
      { order: 7, title: "Clap & count rhythms", description: "Metronome at 60 BPM.", estimatedMinutes: 20, moduleTitle: "Rhythm & timing" },
      { order: 8, title: "Play a one-octave scale", description: "Hands or fingers — slow and even.", estimatedMinutes: 30, moduleTitle: "Scales & keys" },
      { order: 9, title: "Learn three chords", description: "Play a simple song progression.", estimatedMinutes: 40, moduleTitle: "Chords on your instrument" },
    ],
    intermediate: [
      { order: 1, title: "Mix A into B on beat 1", description: "Crossfader phrase drill with metronome accents.", estimatedMinutes: 15, moduleTitle: "Turntables, cue, and the crossfader" },
      { order: 2, title: "Genre chord patterns", description: "I–V–vi–IV and variations.", estimatedMinutes: 35, moduleTitle: "Chords on your instrument" },
      { order: 3, title: "Ear training drills", description: "Identify intervals daily.", estimatedMinutes: 25, moduleTitle: "Ear training" },
      { order: 4, title: "Write an 8-bar melody", description: "Record or notate your idea.", estimatedMinutes: 45, moduleTitle: "Writing music on your instrument" },
    ],
    advanced: [
      { order: 1, title: "Arrange a full song", description: "Intro, verse, chorus, bridge.", estimatedMinutes: 90, moduleTitle: "Writing music on your instrument" },
      { order: 2, title: "Home recording pass", description: "One clean take with a click track.", estimatedMinutes: 60, moduleTitle: "Performance & recording at home" },
      { order: 3, title: "Theory exam drill", description: "Sample questions with explanations.", estimatedMinutes: 45, moduleTitle: "Music theory & exam prep orientation" },
    ],
  },
  "ai-songwriter-001": {
    beginner: [
      { order: 1, title: "Loop the beat", description: "Play mix and write one line that fits the bars.", estimatedMinutes: 12, moduleTitle: "Write lyrics over a Music Studio beat" },
      { order: 2, title: "Name the hook", description: "Turn that line into a chorus candidate.", estimatedMinutes: 15, moduleTitle: "Titles & hooks" },
      { order: 3, title: "Verse after chorus", description: "Four lines of story that lead back to the hook.", estimatedMinutes: 20, moduleTitle: "Song anatomy" },
    ],
    intermediate: [
      { order: 1, title: "Bridge contrast", description: "Write eight bars that are not the chorus.", estimatedMinutes: 25, moduleTitle: "Song anatomy" },
      { order: 2, title: "Rhyme pass", description: "Tighten singability without stealing a famous lyric.", estimatedMinutes: 20, moduleTitle: "Lyrics that land" },
    ],
    advanced: [
      { order: 1, title: "Full draft", description: "Verse / chorus / verse / chorus / bridge — your words.", estimatedMinutes: 45, moduleTitle: "Write lyrics over a Music Studio beat" },
    ],
  },
  "ai-author-001": {
    beginner: [
      { order: 1, title: "Find your story seed", description: "Premise in one sentence.", estimatedMinutes: 20, moduleTitle: "Story ideas that stick" },
      { order: 2, title: "Outline three acts", description: "Beginning, middle, end beats.", estimatedMinutes: 30, moduleTitle: "Three-act structure" },
      { order: 3, title: "Create a protagonist", description: "Goal, flaw, and arc.", estimatedMinutes: 25, moduleTitle: "Characters readers remember" },
    ],
    intermediate: [
      { order: 1, title: "Draft chapter one", description: "Hook the reader in 500 words.", estimatedMinutes: 60, moduleTitle: "Chapter pacing & hooks" },
      { order: 2, title: "Dialogue pass", description: "Read aloud and cut exposition.", estimatedMinutes: 40, moduleTitle: "Dialogue that sounds human" },
    ],
    advanced: [
      { order: 1, title: "Full manuscript revision", description: "Structural edit checklist.", estimatedMinutes: 120, moduleTitle: "Revision & self-editing" },
      { order: 2, title: "Publish plan", description: "Query or self-pub roadmap.", estimatedMinutes: 45, moduleTitle: "Query letters & self-publishing" },
    ],
  },
};

function modulesFor(creatorId: string): Omit<LearningModule, "id">[] {
  return MODULES_BY_CREATOR[creatorId] ?? MODULES_BY_CREATOR["ai-creative-001"]!;
}

export function isCreativeTeachingCreator(creatorId: string): boolean {
  return CREATIVE_TEACHING_CREATOR_IDS.has(creatorId);
}

export function getCreativeTeachingModules(creatorId: string): LearningModule[] {
  return modulesFor(creatorId).map((item, index) => ({
    id: `creative-mod-${creatorId}-${index + 1}`,
    ...item,
  }));
}

export function getCreativeTeachingTagline(creatorId: string): string {
  return TAGLINES[creatorId] ?? "Learn your craft step by step with guided lessons and practice.";
}

export function getCreativeSelfPacedPath(creatorId: string, level: LearningLevel): SelfPacedStep[] {
  return SELF_PACED[creatorId]?.[level] ?? [];
}

const EXERCISES: Record<string, CreativeExercise[]> = {
  "ai-musician-001": [
    { id: "mus-booth", title: "Name the booth", level: "beginner", topic: "UR Music Studio booth", prompt: "I am in UR Music Studio. Quiz me on Deck A, Deck B, Play mix, Cue, and the metronome. Teach, then check my answers. This is not Serato." },
    { id: "mus-turntable", title: "Turntable drill", level: "beginner", topic: "Turntables, cue, and the crossfader", prompt: "Teach me how to use the UR Music Studio turntables: play, spin, scratch, and when to leave the beat alone. Give me a short hands-on drill." },
    { id: "mus-grid", title: "First beat", level: "beginner", topic: "Programming a beat on the grid", prompt: "Walk me through a kick-snare-hat pattern on the UR Music Studio grid in 4/4. Do not generate a finished commercial song." },
    { id: "mus-rhythm", title: "Clap a 4/4 pattern", level: "beginner", topic: "Rhythm & timing", prompt: "Teach me to clap and count a simple 4/4 rhythm with rests. Give me a exercise and check my answers." },
    { id: "mus-scale", title: "Play C major", level: "beginner", topic: "Scales & keys", prompt: "Walk me through playing the C major scale on my instrument — fingering, tempo, and common mistakes." },
    { id: "mus-chords", title: "Three-chord song", level: "intermediate", topic: "Chords on your instrument", prompt: "Give me a three-chord progression exercise in G major and a simple strumming or comping pattern." },
    { id: "mus-ear", title: "Interval quiz", level: "intermediate", topic: "Ear training", prompt: "Quiz me on major and minor 2nds and 3rds — describe how they sound and give me listening drills." },
    { id: "mus-write", title: "Write 8 bars", level: "advanced", topic: "Writing music on your instrument", prompt: "Coach me to compose an 8-bar melody on my instrument — milestones, not the full answer upfront." },
  ],
  "ai-author-001": [
    { id: "auth-premise", title: "One-line premise", level: "beginner", topic: "Story ideas that stick", prompt: "Help me write a compelling one-line premise for my novel. Ask me questions first, then critique my draft." },
    { id: "auth-scene", title: "Opening scene", level: "intermediate", topic: "Chapter pacing & hooks", prompt: "Give me a practice exercise: write an opening scene hook. Provide criteria and feedback rubric." },
  ],
  "ai-poet-001": [
    { id: "poet-haiku", title: "Write a haiku", level: "beginner", topic: "Haiku & short forms", prompt: "Teach haiku structure and give me a prompt to write one. Critique my draft when I share it." },
    { id: "poet-metaphor", title: "Metaphor drill", level: "intermediate", topic: "Imagery & metaphor", prompt: "Give me 5 metaphor exercises using concrete imagery — coach, don't write the poem for me." },
  ],
  "ai-songwriter-001": [
    { id: "song-studio", title: "Hook on this beat", level: "beginner", topic: "Write lyrics over a Music Studio beat", prompt: "I'm in UR Music Studio with a looping beat. Help me write MY own one-line hook. Ask mood first. Do not copy a famous song." },
    { id: "song-hook", title: "Write a chorus hook", level: "beginner", topic: "Titles & hooks", prompt: "Help me brainstorm and refine a chorus hook for a pop song — ask about mood and theme first." },
    { id: "song-bridge", title: "Bridge writing", level: "intermediate", topic: "Song anatomy", prompt: "Explain what a bridge does and give me an exercise to write one for my existing verse/chorus." },
  ],
  "ai-logo-brand-001": [
    { id: "logo-sketch", title: "Logo thumbnails", level: "beginner", topic: "Sketching logo concepts", prompt: "Walk me through a 20-minute logo thumbnail exercise for a café brand — criteria for each sketch." },
    { id: "logo-palette", title: "Palette exercise", level: "intermediate", topic: "Color psychology & palettes", prompt: "Give me a practice brief to choose a 3-color palette with hex codes and accessibility notes." },
  ],
};

export function getCreativePracticeExercises(params: {
  creatorId: string;
  count: number;
  level?: LearningLevel;
}): CreativeExercise[] {
  const pool = EXERCISES[params.creatorId] ?? [];
  const filtered = params.level ? pool.filter((e) => e.level === params.level) : pool;
  const source = filtered.length > 0 ? filtered : pool;
  return source.slice(0, params.count);
}

export function buildCreativeTeachingPromptAddition(
  creatorId: string,
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  const tagline = getCreativeTeachingTagline(creatorId);
  const studioNote =
    creatorId === "ai-musician-001"
      ? `\n- If they are in UR Music Studio, teach THIS booth: turntables, cue, metronome, two-deck crossfader, and the step grid. Do not claim Serato, Ableton, or Pro Tools.
- Give them a try-now on the page (Play mix, Cue A, metronome) before jumping to guitar or piano unless they ask for an instrument.`
      : creatorId === "ai-songwriter-001"
        ? `\n- If they are in UR Music Studio, write WITH their loop and lyrics pad. Coach structure; do not paste copyrighted lyrics or a finished commercial hit.`
        : "";
  const instrumentNote =
    creatorId === "ai-musician-001"
      ? `\n- Ask which instrument they play (guitar, piano, drums, bass, ukulele, voice, etc.) and adapt fingering/posture advice.
- Use tab, chord charts, or notation descriptions when helpful — educational only.
- Encourage slow metronome practice; never skip warm-up and ergonomics reminders.`
      : "";
  const writingNote =
    creatorId === "ai-author-001" || creatorId === "ai-poet-001" || creatorId === "ai-songwriter-001"
      ? `\n- Coach the learner to produce their own draft — give prompts and rubrics, not full commercial-ready work upfront.
- Discuss copyright and originality when relevant.`
      : "";

  return `
## Creative arts academy (${tagline})
Level: ${level}. Mode: ${mode}. Topic: ${topic ?? "fundamentals"}.
${studioNote}${instrumentNote}${writingNote}
- Use **Learning goal → Steps → Practice task → Feedback questions → Next module** structure.
- Celebrate small wins; adapt to ${level} vocabulary.
`.trim();
}
