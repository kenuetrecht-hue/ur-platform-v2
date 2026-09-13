const STORAGE_KEY = "ur.ageKycDocumentToken";

let documentToken: string | null = null;

function readSessionToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSessionToken(token: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function setAgeKycDocumentToken(token: string | null): void {
  documentToken = token;
  writeSessionToken(token);
}

export function getAgeKycDocumentToken(): string | null {
  if (documentToken) return documentToken;
  const stored = readSessionToken();
  if (stored) documentToken = stored;
  return documentToken;
}

export function clearAgeKycDocumentToken(): void {
  setAgeKycDocumentToken(null);
}

export function hasAgeKycDocumentToken(): boolean {
  return Boolean(getAgeKycDocumentToken());
}
