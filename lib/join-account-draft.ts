const STORAGE_KEY = "ur.joinAccountDraft";

export type JoinAccountDraft = {
  name: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
  turnstileToken: string;
};

const emptyDraft = (): JoinAccountDraft => ({
  name: "",
  email: "",
  password: "",
  acceptedTerms: false,
  turnstileToken: "",
});

let memoryDraft: JoinAccountDraft | null = null;

function readSessionDraft(): JoinAccountDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<JoinAccountDraft>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      password: typeof parsed.password === "string" ? parsed.password : "",
      acceptedTerms: parsed.acceptedTerms === true,
      turnstileToken: typeof parsed.turnstileToken === "string" ? parsed.turnstileToken : "",
    };
  } catch {
    return null;
  }
}

function writeSessionDraft(draft: JoinAccountDraft | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!draft) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

export function saveJoinAccountDraft(draft: JoinAccountDraft): void {
  memoryDraft = { ...draft };
  writeSessionDraft(memoryDraft);
}

export function loadJoinAccountDraft(): JoinAccountDraft {
  if (memoryDraft) return { ...memoryDraft };
  const stored = readSessionDraft();
  if (stored) {
    memoryDraft = stored;
    return { ...stored };
  }
  return emptyDraft();
}

export function clearJoinAccountDraft(): void {
  memoryDraft = null;
  writeSessionDraft(null);
}

export function canContinueToIdPictures(draft: JoinAccountDraft): boolean {
  return (
    draft.name.trim().length > 0 &&
    draft.email.trim().length > 0 &&
    draft.password.trim().length >= 6 &&
    draft.acceptedTerms
  );
}
