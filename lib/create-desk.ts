/** Create doors under Make — each one has a real page. */

export type CreateDraftKind = "video" | "image" | "text";

export type CreateDraft = {
  id: string;
  kind: CreateDraftKind;
  title: string;
  body: string;
  updatedAt: string;
};

export type CreateTemplate = {
  id: string;
  label: string;
  detail: string;
  route: "/create/video" | "/create/image" | "/create/text" | "/create/calendar" | "/cartoon-studio" | "/music-studio";
  kind?: CreateDraftKind;
  title: string;
  body: string;
};

export const CREATE_DESK_ROUTES = {
  video: "/create/video",
  image: "/create/image",
  text: "/create/text",
  templates: "/create/templates",
  calendar: "/create/calendar",
  drafts: "/create/drafts",
} as const;

export const CREATE_TEMPLATES: CreateTemplate[] = [
  {
    id: "short-video",
    label: "Short video",
    detail: "A hook, one idea, and a closer. Then open Cartoon Studio to film it.",
    route: "/create/video",
    kind: "video",
    title: "Short video",
    body: "Open on a problem in the first second. Show one fix. End by telling the viewer what to do next.",
  },
  {
    id: "class-promo",
    label: "Class promo",
    detail: "A caption for a live class. Author Muse can stretch it into a full post.",
    route: "/create/text",
    kind: "text",
    title: "Class promo",
    body: "What the class teaches, who it is for, and the one reason to show up live.",
  },
  {
    id: "square-image",
    label: "Square picture",
    detail: "A picture prompt for ContentMate. You can also open Logo & Brand.",
    route: "/create/image",
    kind: "image",
    title: "Square picture",
    body: "A clear square picture of the subject, simple background, no words in the image.",
  },
  {
    id: "week-plan",
    label: "Week of posts",
    detail: "Seven days. Write what you will post on each day.",
    route: "/create/calendar",
    kind: undefined,
    title: "Week of posts",
    body: "",
  },
  {
    id: "cartoon",
    label: "Cartoon video",
    detail: "Opens Cartoon Studio, where the cartoon is actually made.",
    route: "/cartoon-studio",
    title: "Cartoon video",
    body: "",
  },
  {
    id: "music",
    label: "Music",
    detail: "Opens Music Studio for a beat or a song.",
    route: "/music-studio",
    title: "Music",
    body: "",
  },
];

export function templateById(id: string): CreateTemplate | undefined {
  return CREATE_TEMPLATES.find((template) => template.id === id);
}

export function formatDeskDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function weekDates(from = new Date()): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(from);
    day.setDate(from.getDate() + index);
    return formatDeskDate(day);
  });
}

export function deskWeekdayLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function newDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clipDeskText(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function upsertDraft(drafts: CreateDraft[], next: CreateDraft): CreateDraft[] {
  return [next, ...drafts.filter((draft) => draft.id !== next.id)].slice(0, 40);
}
