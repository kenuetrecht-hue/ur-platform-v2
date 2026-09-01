/** Map cryptic browser/network errors to an action the owner can take. */

export function explainAuthFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("doctype") ||
    lower.includes("not valid json") ||
    lower.includes("unexpected token <")
  ) {
    return "The app reached the website instead of the API. Keep pnpm dev:web running and open http://localhost:8082 — then refresh the page.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("fetch failed") ||
    lower.includes("enotfound") ||
    lower.includes("err_name_not_resolved") ||
    lower.includes("err_internet_disconnected")
  ) {
    return [
      "Cannot reach the sign-in service.",
      "The Supabase project in .env is offline or was deleted (the URL does not resolve).",
      "Create a project at https://supabase.com/dashboard, copy Project URL and anon key into EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, save, then restart pnpm dev:web.",
    ].join(" ");
  }

  return raw.trim() || "Sign in failed. Please try again.";
}
