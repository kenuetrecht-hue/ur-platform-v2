/**
 * One-time handoff: every new account is sent to the join e-manual after ID check.
 */

const KEY = "ur_give_join_emanual";

let pending = false;

function webStore(): Storage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

export function markGiveJoinEmanual(): void {
  pending = true;
  webStore()?.setItem(KEY, "1");
}

export function shouldGiveJoinEmanual(): boolean {
  if (pending) return true;
  return webStore()?.getItem(KEY) === "1";
}

export function clearGiveJoinEmanual(): void {
  pending = false;
  webStore()?.removeItem(KEY);
}
