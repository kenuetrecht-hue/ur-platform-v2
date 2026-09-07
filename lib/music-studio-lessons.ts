/**
 * Music Studio classroom — how to use OUR booth, not Serato or a conservatory course.
 * Educational only. Musician + Songwriter still coach instruments and lyrics.
 */

export const MUSIC_STUDIO_CLASS_RULE =
  "These lessons teach UR Music Studio: the two decks, cue, metronome, beat grid, and hookups you start. They are not a DJ-school diploma, not Serato, and not a substitute for a licensed music teacher.";

export type MusicStudioLessonLevel = "beginner" | "intermediate";
export type MusicStudioCoachId = "ai-musician-001" | "ai-songwriter-001";

export type MusicStudioLesson = {
  id: string;
  title: string;
  level: MusicStudioLessonLevel;
  minutes: number;
  goal: string;
  steps: string[];
  tryNow: string;
  coach: MusicStudioCoachId;
  ask: string;
};

export const MUSIC_STUDIO_LESSONS: readonly MusicStudioLesson[] = [
  {
    id: "booth",
    title: "What this studio is",
    level: "beginner",
    minutes: 4,
    goal: "Know the room: a practice booth with two decks, a grid, lyrics, and two teachers — not a hit-song generator.",
    steps: [
      "The desk above is UR Music Studio. Play mix starts both decks. Stop ends the loop.",
      "Musician AI teaches time, instruments, and the booth. Songwriter AI teaches lyrics and song shape.",
      "UR Studio Pro (optional) adds extra tracks, mixer, FX, and WAV export. Free still has four tracks and this classroom.",
      "Nothing here starts someone else's printer, deck, or DAW. We give you a file or an OS dialog. You press Start.",
    ],
    tryNow: "Read the rule under the page title. Then tap Play mix once so you hear the default beat.",
    coach: "ai-musician-001",
    ask: "I just opened UR Music Studio. Teach me what this booth is, what it is not, and the first three things I should try.",
  },
  {
    id: "turntable",
    title: "How to use a turntable",
    level: "beginner",
    minutes: 6,
    goal: "Spin a platter, hear the beat, and scratch without breaking time.",
    steps: [
      "A turntable is a spinning disc. In a club, vinyl sits on it. Here, Deck A and Deck B are those platters.",
      "Hit Play mix. The tonearm drops and the disc turns at your BPM. That is 'on the record.'",
      "Drag the vinyl to scratch — a short noise. Use it as an effect, then let the loop keep time.",
      "If the platter is still, there is no music from that deck. Play mix first, then scratch.",
      "Real DJ vinyl needs a needle, slipmat, and pitch. We teach the idea here. Your USB deck at home still needs you to load the file.",
    ],
    tryNow: "Play mix, watch Deck A spin, then drag that platter once. Listen for the scratch.",
    coach: "ai-musician-001",
    ask: "Teach me how to use the UR Music Studio turntables like a beginner DJ: play, spin, scratch, and when to leave the beat alone.",
  },
  {
    id: "cue-metro",
    title: "Cue and the metronome",
    level: "beginner",
    minutes: 6,
    goal: "Find the downbeat, preview a bar, and practice with a click.",
    steps: [
      "The metronome is a click on every quarter note. Accent (higher click) is beat 1 of the bar. Musicians practice with this so they do not rush.",
      "Turn Metronome on, hit Play mix, and clap with the loud click. That is counting 1-2-3-4.",
      "Cue is 'start from this spot.' Set cue here on the gold-outlined step, or leave it at step 0 (the top of the loop).",
      "Cue A or Cue B while stopped plays four steps from that cue — a preview, like headphones on a real mixer.",
      "Cue while the mix is already playing jumps the playhead to that cue. Use it to restart a verse cleanly.",
    ],
    tryNow: "Turn Metronome on. Play mix. Tap Cue A. Then tap Set cue here on a snare hit and Cue A again.",
    coach: "ai-musician-001",
    ask: "Teach me cue points and the metronome in UR Music Studio. Give me a 4/4 counting drill I can do on this page.",
  },
  {
    id: "two-decks",
    title: "Two decks and the crossfader",
    level: "beginner",
    minutes: 7,
    goal: "Mix Deck A into Deck B the way a DJ leans the fader.",
    steps: [
      "Deck A is one loop. Deck B is a second loop (hats and claps by default so you can hear the difference).",
      "The crossfader is the mix: A = only A, 50 = both, B = only B. Equal-power so the middle is not twice as loud.",
      "Edit grid switches which loop you tap. Gold border is that deck's cue step.",
      "Copy A → B duplicates the beat so you can change only Deck B (add hats, drop the kick).",
      "A real club mixer also has channel gains and EQ. Our fader is the first skill: hear A, hear B, hear both.",
    ],
    tryNow: "Play mix. Park the fader on A, then 50, then B. Use Copy A → B and add one extra hat on Deck B.",
    coach: "ai-musician-001",
    ask: "Teach me two-deck mixing on UR Music Studio: crossfader, when both decks should play, and a simple A-to-B practice.",
  },
  {
    id: "first-beat",
    title: "Make your first beat",
    level: "beginner",
    minutes: 10,
    goal: "Program kick, snare, hat, and bass so a four-count groove holds.",
    steps: [
      "Each row is a sound. Each pad is a 16th-note step. A lit pad plays. Dark pad is rest.",
      "Hip-hop starter: kick on 1 and 3 (steps 0 and 8), snare on 2 and 4 (steps 4 and 12), hats on the even steps.",
      "Pick a kit (hiphop, house, rock, latin) and a BPM. 90 is walk-around. 128 is dance. Stay in one tempo while you learn.",
      "Play mix after every few taps. If it feels busy, turn pads off. Space is part of the beat.",
      "Save so you do not lose the pattern. Share a collab code only with people you trust on this beat.",
    ],
    tryNow: "Clear extra pads if you want a simpler kick-snare-hat. Play mix. Change BPM to 90, then 110, and listen.",
    coach: "ai-musician-001",
    ask: "Walk me through making my first UR Music Studio beat: kick, snare, hat, bass, and how to count it. Do not generate a finished commercial song.",
  },
  {
    id: "write-song",
    title: "Write a song on the beat",
    level: "beginner",
    minutes: 10,
    goal: "Put words on the loop: hook first, then a verse, without asking the AI to steal a famous song.",
    steps: [
      "Leave the beat looping. Hum one short line that fits the bars — that is a hook candidate.",
      "Type it in the lyrics pad. Songwriter AI helps you tighten lines, rhyme, and structure. It should not paste a copyrighted hit.",
      "Common shape: verse (story) → chorus (the line people remember) → verse → chorus. A bridge is a later skill.",
      "Match the key chips to a simple progression (shown under Key). Musician can explain I–V–vi–IV on your instrument.",
      "Print the lead sheet when you want paper. You pick the printer.",
    ],
    tryNow: "Write one chorus line in the lyrics pad. Switch to Songwriter AI and ask it to workshop that line only.",
    coach: "ai-songwriter-001",
    ask: "I'm in UR Music Studio. Help me write my own hook and a short verse over this beat. Coach me — do not write a finished commercial song or copy a famous artist.",
  },
  {
    id: "hookups",
    title: "Printer, MIDI, USB, and headphones",
    level: "beginner",
    minutes: 6,
    goal: "Move your work onto paper, a DAW, a USB deck, or your headphones — you start the other machine.",
    steps: [
      "Speakers and headphones: the beat already uses whatever output your phone or computer chose.",
      "Bluetooth: pair headphones in your OS Bluetooth settings. UR will not scan nearby phones.",
      "Print lead sheet: lyrics and chords through the print dialog. You pick the printer.",
      "Download MIDI or USB deck pack: files land in Downloads. Copy the .mid to a stick, load it on your deck, then you press Start.",
      "Connect MIDI / Pick audio in: only after you tap Allow. We list devices you permitted. Nothing is uploaded.",
    ],
    tryNow: "Open Studio hookups. Read Bluetooth help. Download MIDI once so you see the file in Downloads.",
    coach: "ai-musician-001",
    ask: "Teach me UR Music Studio hookups: print, MIDI, USB deck, Bluetooth headphones, and audio interface — same rule as CNC: you send the file, I start the machine.",
  },
  {
    id: "mix-two-loops",
    title: "Blend two loops",
    level: "intermediate",
    minutes: 8,
    goal: "Build a complementary Deck B and mix into it on a phrase.",
    steps: [
      "A phrase is often 4 or 8 bars. Count 1-2-3-4 four times, then move the fader.",
      "Keep Deck A's kick. On Deck B, thin the kick and add hats or clap so the blend is a change, not a double drum kit.",
      "Move 50 → B on beat 1, not in the middle of a snare. The metronome accent helps you find beat 1.",
      "If both decks scream, pull the fader back to 50 and mute a busy row on B.",
    ],
    tryNow: "Play mix with metronome. At an accent click, slide A → 50 → B. Repeat until the move lands on 1.",
    coach: "ai-musician-001",
    ask: "Coach an intermediate two-deck mix in UR Music Studio: phrase length, complementary patterns, and moving the crossfader on beat 1.",
  },
  {
    id: "practice-routine",
    title: "A 15-minute practice routine",
    level: "intermediate",
    minutes: 8,
    goal: "Leave with a habit: click, groove, words, then one hookup — not a finished album.",
    steps: [
      "Minutes 1–3: metronome on, clap 4/4 at 90 BPM. No pads yet.",
      "Minutes 4–8: program or tidy the grid. Play mix. Change one thing at a time.",
      "Minutes 9–12: write or speak one new lyric line. Ask Songwriter only after you have a line.",
      "Minutes 13–15: Cue drill or fader drill. Save. Optional: MIDI download for tomorrow's DAW.",
      "This does not replace private lessons or graded exams. It is how you use this booth every day.",
    ],
    tryNow: "Set a 15-minute timer. Do the click, then one grid change, then Save.",
    coach: "ai-musician-001",
    ask: "Give me a 15-minute UR Music Studio practice routine for today using metronome, the grid, and one cue or fader drill.",
  },
] as const;

export function musicStudioLessonsByLevel(level?: MusicStudioLessonLevel): MusicStudioLesson[] {
  if (!level) return [...MUSIC_STUDIO_LESSONS];
  return MUSIC_STUDIO_LESSONS.filter((lesson) => lesson.level === level);
}

export function getMusicStudioLesson(id: string): MusicStudioLesson | undefined {
  return MUSIC_STUDIO_LESSONS.find((lesson) => lesson.id === id);
}

export function musicStudioLessonAsk(lesson: MusicStudioLesson): string {
  return lesson.ask;
}
