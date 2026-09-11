const STORAGE_KEY = "ur.ageKycPassToken";

let passToken: string | null = null;

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

export function setAgeKycPassToken(token: string | null): void {
  passToken = token;
  writeSessionToken(token);
}

export function getAgeKycPassToken(): string | null {
  if (passToken) return passToken;
  const stored = readSessionToken();
  if (stored) passToken = stored;
  return passToken;
}

export function clearAgeKycPassToken(): void {
  setAgeKycPassToken(null);
}

export function hasAgeKycPassToken(): boolean {
  return Boolean(getAgeKycPassToken());
}
