import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clipDeskText,
  newDraftId,
  upsertDraft,
  type CreateDraft,
  type CreateDraftKind,
} from "@/lib/create-desk";

const STORAGE_KEY = "ur.createDesk.v1";

type DeskStore = {
  drafts: CreateDraft[];
  calendar: Record<string, string>;
};

const EMPTY: DeskStore = { drafts: [], calendar: {} };

async function readStore(): Promise<DeskStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DeskStore>;
    return {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      calendar: parsed.calendar && typeof parsed.calendar === "object" ? parsed.calendar : {},
    };
  } catch {
    return EMPTY;
  }
}

async function writeStore(store: DeskStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function listDrafts(): Promise<CreateDraft[]> {
  const store = await readStore();
  return store.drafts;
}

export async function getDraft(id: string): Promise<CreateDraft | undefined> {
  const drafts = await listDrafts();
  return drafts.find((draft) => draft.id === id);
}

export async function saveDraft(input: {
  id?: string;
  kind: CreateDraftKind;
  title: string;
  body: string;
}): Promise<CreateDraft> {
  const store = await readStore();
  const next: CreateDraft = {
    id: input.id || newDraftId(),
    kind: input.kind,
    title: clipDeskText(input.title, 80) || "Untitled",
    body: clipDeskText(input.body, 2000),
    updatedAt: new Date().toISOString(),
  };
  store.drafts = upsertDraft(store.drafts, next);
  await writeStore(store);
  return next;
}

export async function deleteDraft(id: string): Promise<void> {
  const store = await readStore();
  store.drafts = store.drafts.filter((draft) => draft.id !== id);
  await writeStore(store);
}

export async function loadCalendar(): Promise<Record<string, string>> {
  const store = await readStore();
  return store.calendar;
}

export async function saveCalendarNotes(notes: Record<string, string>): Promise<void> {
  const store = await readStore();
  const next: Record<string, string> = { ...store.calendar };
  for (const [date, note] of Object.entries(notes)) {
    const clipped = clipDeskText(note, 240);
    if (clipped) next[date] = clipped;
    else delete next[date];
  }
  store.calendar = next;
  await writeStore(store);
}
