import { supabaseUnreachableHint } from "../shared/supabase-config";
import { isAlreadyRegisteredAuthError } from "./auth-already-registered";

/** Map cryptic browser/network errors to an action the owner can take. */

export function explainAuthFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("doctype") ||
    lower.includes("not valid json") ||
    lower.includes("unexpected token <") ||
    lower.includes("entity too large") ||
    lower.includes("payload too large")
  ) {
    const onLocalhost =
      typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname);
    if (onLocalhost) {
      return "The app reached the website instead of the API. Keep pnpm dev:web running and open http://localhost:8082 — then refresh the page.";
    }
    return "Those pictures could not be checked. They may be too large, or the site is still starting. Take the three pictures again and tap Check my three pictures.";
  }

  if (
    lower.includes("unable to transfer") ||
    lower.includes("transfer response") ||
    lower.includes("err_http2") ||
    lower.includes("err_connection_reset") ||
    lower.includes("err_connection_closed") ||
    lower.includes("err_network_changed") ||
    lower.includes("the operation was aborted") ||
    lower.includes("aborted") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("econnreset")
  ) {
    return "The picture check did not finish. Keep the three pictures, wait a few seconds, and tap Check my three pictures again.";
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
    return supabaseUnreachableHint();
  }

  if (lower.includes("please login") || lower.includes("10001")) {
    return "Please login with your email and password. If your pictures already passed, you do not need to take them again.";
  }

  if (isAlreadyRegisteredAuthError(raw)) {
    return "That email is already on UR. We are logging you in with the password you typed.";
  }

  return raw.trim() || "Login failed. Please try again.";
}
