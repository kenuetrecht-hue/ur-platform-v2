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

export function isNewPasswordPath(path: string): boolean {
  return path.includes("new-password");
}
