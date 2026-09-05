/**
 * Hourglass lessons — 60-minute paid classes the AIs assemble and host.
 * People pay per minute to sit in. Teaching only; not a license or field work.
 */

export const HOURGLASS_LESSON_MINUTES = 60;

/** Trade AIs that ship ready to host a beginner hourglass. */
export const HOURGLASS_READY_AI_IDS = [
  "ai-electrician-001",
  "ai-hvac-001",
  "ai-welder-001",
  "ai-plumber-001",
] as const;

export type HourLessonSegment = {
  minuteStart: number;
  minuteEnd: number;
  title: string;
  talkingPoints: string[];
};

export type HourLessonCatalogEntry = {
  id: string;
  creatorAiId: string;
  level: "beginner";
  title: string;
  topic: string;
  description: string;
  safetyNote: string;
  segments: HourLessonSegment[];
};

const SAFETY_FOOTER =
  "Teaching and demonstration only. Follow local codes. Licensed tradespeople do real installs.";

function hourSegments(
  blocks: Array<[number, number, string, string[]]>,
): HourLessonSegment[] {
  return blocks.map(([minuteStart, minuteEnd, title, talkingPoints]) => ({
    minuteStart,
    minuteEnd,
    title,
    talkingPoints,
  }));
}

export const HOURGLASS_TRADE_LESSONS: HourLessonCatalogEntry[] = [
  {
    id: "electrician-beginner",
    creatorAiId: "ai-electrician-001",
    level: "beginner",
    title: "Beginner electrician — safe circuits for the hour",
    topic: "Beginner electrician hour: voltage, panels, and safe troubleshooting",
    description:
      "Electrician Expert AI hosts a 60-minute beginner hourglass: how a circuit works, what a panel does, and how to think before you touch anything.",
    safetyNote: `${SAFETY_FOOTER} De-energize before any hands-on practice. This is not a license class.`,
    segments: hourSegments([
      [0, 5, "Welcome and hourglass clock", ["Confirm the full hour", "How per-minute tickets work", "Safety first"]],
      [5, 18, "How electricity moves", ["Voltage, current, resistance in plain words", "Hot, neutral, ground", "Why overload trips a breaker"]],
      [18, 32, "The panel and a simple circuit", ["What a breaker is for", "Reading a simple one-line", "When to stop and call a licensed electrician"]],
      [32, 48, "Beginner troubleshooting path", ["Look, listen, smell — then test", "OEM label and model lookup", "Common outlet and switch symptoms"]],
      [48, 58, "Live Q&A", ["Attendee questions", "Redirect field work to a licensed pro"]],
      [58, 60, "Close", ["Recap", "Codes and next class"]],
    ]),
  },
  {
    id: "hvac-beginner",
    creatorAiId: "ai-hvac-001",
    level: "beginner",
    title: "Beginner HVAC — how a house heats and cools",
    topic: "Beginner HVAC hour: airflow, refrigerants, and safe diagnosis",
    description:
      "HVAC Specialist AI hosts a 60-minute beginner hourglass: the refrigeration cycle, airflow, and how to read a unit without guessing.",
    safetyNote: `${SAFETY_FOOTER} EPA rules apply to refrigerant. Do not open a charged system in this class.`,
    segments: hourSegments([
      [0, 5, "Welcome and hourglass clock", ["Confirm the full hour", "What this class will and will not do"]],
      [5, 18, "The refrigeration cycle", ["Evaporator, compressor, condenser, metering", "Heat moves — it is not destroyed", "Why airflow matters as much as charge"]],
      [18, 32, "Furnace and heat pump basics", ["Gas vs electric heat", "Reversing valve in plain words", "Filters, coils, and condensate"]],
      [32, 48, "Beginner diagnosis path", ["Thermostat vs equipment", "OEM model lookup", "When the job needs a licensed HVAC tech"]],
      [48, 58, "Live Q&A", ["Attendee questions", "EPA and local license notes"]],
      [58, 60, "Close", ["Recap", "Next class"]],
    ]),
  },
  {
    id: "welder-beginner",
    creatorAiId: "ai-welder-001",
    level: "beginner",
    title: "Beginner welding — process, PPE, and a clean bead",
    topic: "Beginner welding hour: SMAW/GMAW basics, PPE, and joint setup",
    description:
      "AI Welder hosts a 60-minute beginner hourglass: which process to start with, PPE, and how a sound bead is set up — not a structural cert.",
    safetyNote: `${SAFETY_FOOTER} PPE is required for any shop practice. This is not a structural welding certification.`,
    segments: hourSegments([
      [0, 5, "Welcome and hourglass clock", ["Confirm the full hour", "Shop safety before any arc"]],
      [5, 18, "Processes in plain words", ["Stick vs MIG vs TIG", "What beginners usually start with", "Machine labels and OEM lookup"]],
      [18, 32, "PPE and the work area", ["Helmet, gloves, jacket, ventilation", "Fire watch", "Why galvanized and confined space are stop signs"]],
      [32, 48, "Joint setup and a practice bead", ["Fit-up and cleanliness", "Travel speed and angle", "When a job needs a certified welder"]],
      [48, 58, "Live Q&A", ["Attendee questions", "No structural sign-off in this room"]],
      [58, 60, "Close", ["Recap", "Next class"]],
    ]),
  },
  {
    id: "plumber-beginner",
    creatorAiId: "ai-plumber-001",
    level: "beginner",
    title: "Beginner plumbing — supply, drain, and a dry fixture",
    topic: "Beginner plumbing hour: supply vs drain, traps, and water heaters",
    description:
      "Plumber AI hosts a 60-minute beginner hourglass: how water gets in, how waste gets out, and what a trap is for.",
    safetyNote: `${SAFETY_FOOTER} Shut water off before any practice. Gas water heaters and sewer work need a licensed plumber.`,
    segments: hourSegments([
      [0, 5, "Welcome and hourglass clock", ["Confirm the full hour", "Wet vs dry demonstration rules"]],
      [5, 18, "Supply vs drain", ["Pressure in, gravity out", "Hot and cold", "Why a trap holds water"]],
      [18, 32, "Fixtures and a water heater", ["Shutoffs and supply lines", "Tank vs tankless labels", "OEM model lookup"]],
      [32, 48, "Beginner leak path", ["Look before you cut", "Common drip points", "When to stop and call a licensed plumber"]],
      [48, 58, "Live Q&A", ["Attendee questions", "No gas-line work in this class"]],
      [58, 60, "Close", ["Recap", "Next class"]],
    ]),
  },
];

export function listHourglassTradeLessons(): HourLessonCatalogEntry[] {
  return HOURGLASS_TRADE_LESSONS;
}

export function getHourglassLesson(id: string): HourLessonCatalogEntry | null {
  return HOURGLASS_TRADE_LESSONS.find((lesson) => lesson.id === id) ?? null;
}

export function listHourglassLessonsForAi(creatorAiId: string): HourLessonCatalogEntry[] {
  return HOURGLASS_TRADE_LESSONS.filter((lesson) => lesson.creatorAiId === creatorAiId);
}

export function buildHourLessonHostScript(lesson: HourLessonCatalogEntry): string {
  const timeline = lesson.segments
    .map(
      (segment) =>
        `${segment.minuteStart}–${segment.minuteEnd} min: ${segment.title}. ${segment.talkingPoints.join(" ")}`,
    )
    .join("\n");
  return [
    `You are hosting this hourglass: ${lesson.title}.`,
    `Stay live for the full ${HOURGLASS_LESSON_MINUTES} minutes. Do not wrap up early.`,
    "This is a generated lesson video the AI assembled for this hour. Teach from the timeline. Invite questions in the Q&A block.",
    lesson.safetyNote,
    "Timeline:",
    timeline,
  ].join("\n");
}

export function buildCustomHourLesson(params: {
  creatorAiId: string;
  creatorName: string;
  topic: string;
}): HourLessonCatalogEntry {
  const topic = params.topic.trim();
  return {
    id: `custom-${params.creatorAiId}`,
    creatorAiId: params.creatorAiId,
    level: "beginner",
    title: `Beginner hour — ${topic}`,
    topic,
    description: `${params.creatorName} hosts a 60-minute beginner hourglass on ${topic}.`,
    safetyNote: SAFETY_FOOTER,
    segments: hourSegments([
      [0, 5, "Welcome and hourglass clock", ["Confirm the full hour", `Today's topic: ${topic}`]],
      [5, 20, "Core ideas", ["Define the basics", "Show the parts", "Safety limits"]],
      [20, 40, "Walkthrough", ["Step-by-step demonstration", "Common mistakes", "When to stop"]],
      [40, 55, "Live Q&A", ["Attendee questions"]],
      [55, 60, "Close", ["Recap", "Next practice"]],
    ]),
  };
}
