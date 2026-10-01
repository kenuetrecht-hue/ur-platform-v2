import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PASSWORD_RECOVERY_STASH_KEY,
  authCallbackParams,
  shouldCapturePasswordRecoveryHref,
} from "@/lib/password-recovery-url";

const NEED_LINK =
  "This page needs the email link. Open Login and tap Send a new password.";
const EXPIRED_LINK =
  "That reset link expired. Open Login and tap Send a new password again.";
const OTHER_BROWSER =
  "Open that email on the same phone or computer where you tapped Send a new password, or send a new email from Login.";

function readStash(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stashed = window.sessionStorage.getItem(PASSWORD_RECOVERY_STASH_KEY);
    if (stashed) return stashed;
  } catch {
    /* private mode can block storage */
  }
  const href = window.location.href;
  return shouldCapturePasswordRecoveryHref(href) ? href : null;
}

function clearStash(): void {
  try {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STASH_KEY);
  } catch {
    /* ignore */
  }
}

/** Turn the email link into a session, then the New password form can save. */
export async function completePasswordRecovery(
  supabase: SupabaseClient,
): Promise<{ ready: boolean; message: string | null }> {
  const href = readStash();
  if (!href) {
    const { data } = await supabase.auth.getSession();
    return { ready: Boolean(data.session), message: data.session ? null : NEED_LINK };
  }

  const params = authCallbackParams(href);
  if (params.error || params.errorDescription) {
    clearStash();
    return { ready: false, message: EXPIRED_LINK };
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    clearStash();
    if (error || !data.session) return { ready: false, message: OTHER_BROWSER };
    return { ready: true, message: null };
  }

  if (params.accessToken && params.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    clearStash();
    if (error || !data.session) return { ready: false, message: EXPIRED_LINK };
    return { ready: true, message: null };
  }

  clearStash();
  return { ready: false, message: NEED_LINK };
}
