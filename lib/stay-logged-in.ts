const PREFERENCE_KEY = "ur.stayLoggedIn";

/** Default is stay signed in, so opening the app brings them back in. */
export function getStayLoggedIn(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    const value = localStorage.getItem(PREFERENCE_KEY);
    if (value === "0" || value === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function setStayLoggedIn(value: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(PREFERENCE_KEY, value ? "1" : "0");
  } catch {
    /* private mode */
  }
}
