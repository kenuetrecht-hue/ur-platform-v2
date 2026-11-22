import { CONDUCT_RULES_VERSION } from "@/lib/platform-terms-of-use";

const KEY = "ur.joinRulesAgreedVersion";

/** The signup box already covered the current rules. Remember that on this browser. */
export function rememberJoinRulesAgreement(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, CONDUCT_RULES_VERSION);
  } catch {
    /* private mode */
  }
}

export function hasRememberedJoinAgreement(version: string): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(KEY) === version;
  } catch {
    return false;
  }
}
