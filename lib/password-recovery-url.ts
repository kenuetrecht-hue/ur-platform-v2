/** Official public website. */
export const PUBLIC_WEBSITE_ORIGIN = "https://urplatform.llc" as const;

/** Inbox links stay on the site the person is using, or the official name. */
export function websiteOriginForAuthLinks(origin?: string): string {
  if (origin && /^https?:\/\//i.test(origin)) {
    return origin.replace(/\/+$/, "");
  }
  return PUBLIC_WEBSITE_ORIGIN;
}

export function passwordResetRedirectUrl(origin?: string): string {
  const liveOrigin =
    origin ??
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : undefined);
  return `${websiteOriginForAuthLinks(liveOrigin)}/new-password`;
}

/** Supabase recovery emails put type=recovery in the hash or query. */
export function isPasswordRecoveryHref(href: string): boolean {
  return /(?:[?#&]|%23|%26)type=recovery(?:&|%26|$)/i.test(href);
}

/** Kept only long enough to turn the email link into a session. */
export const PASSWORD_RECOVERY_STASH_KEY = "ur-password-recovery-href";

export type AuthCallbackParams = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  type?: string;
  error?: string;
  errorDescription?: string;
};

/** Email links carry the session in the hash or a one-time code in the query. */
export function authCallbackParams(href: string): AuthCallbackParams {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return {};
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const pick = (key: string) => hash.get(key) || url.searchParams.get(key) || undefined;
  return {
    accessToken: pick("access_token"),
    refreshToken: pick("refresh_token"),
    code: pick("code"),
    type: pick("type"),
    error: pick("error"),
    errorDescription: pick("error_description"),
  };
}

/**
 * True when this address is a Supabase password-reset landing.
 * A code on any other page is left alone.
 */
export function shouldCapturePasswordRecoveryHref(href: string): boolean {
  if (isPasswordRecoveryHref(href)) return true;
  const params = authCallbackParams(href);
  if (params.accessToken || params.refreshToken) return true;
  if (params.type === "sms") return true;
  if (params.error || params.errorDescription) {
    return isPasswordRecoveryHref(href) || href.includes("new-password");
  }
  if (params.code && href.includes("new-password")) return true;
  return false;
}

/** Router path after the token is stored. The token must not stay in the address. */
export function pathForPasswordRecoveryLanding(pathname: string): string {
  if (!pathname || pathname === "/") return "/new-password";
  if (!pathname.includes("new-password")) return "/new-password";
  return pathname;
}

/** Runs before the app router so the email token cannot open a blank screen. */
export function passwordRecoveryBootstrapScript(): string {
  return `(function(){try{var href=window.location.href;var hash=window.location.hash||"";var search=window.location.search||"";var joined=hash+"&"+search;var recovery=/type=recovery/i.test(joined)||/type%3Drecovery/i.test(href);var sms=/type=sms/i.test(joined);var token=/access_token=/.test(hash);var code=/(?:\\?|&)code=/.test(search);var onReset=(window.location.pathname||"").indexOf("new-password")!==-1;if(!recovery&&!sms&&!token&&!(onReset&&code))return;sessionStorage.setItem(${JSON.stringify(PASSWORD_RECOVERY_STASH_KEY)},href);var path=window.location.pathname||"/";if(path==="/"||path.indexOf("new-password")===-1)path="/new-password";window.history.replaceState(null,"",path);}catch(e){}})();`;
}

export function isNewPasswordPath(path: string): boolean {
  return path.includes("new-password");
}
