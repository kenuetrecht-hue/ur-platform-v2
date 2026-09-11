const STORAGE_KEY = "ur.joinAccountDraft";

export type JoinAccountDraft = {
  name: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
};

export function saveJoinAccountDraft(draft: JoinAccountDraft): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

export function loadJoinAccountDraft(): JoinAccountDraft {
  const empty = { name: "", email: "", password: "", acceptedTerms: false };
  if (typeof sessionStorage === "undefined") return empty;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<JoinAccountDraft>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      password: typeof parsed.password === "string" ? parsed.password : "",
      acceptedTerms: parsed.acceptedTerms === true,
    };
  } catch {
    return empty;
  }
}

export function clearJoinAccountDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}
