/**
 * Client-safe bot / disposable-signup policy.
 * Server enforcement lives in server/_core/bot-abuse-guard.ts.
 */

/** Max Cloudflare Turnstile checks per IP per 10 minutes (login, signup, demo, KYC). */
export const AUTH_CHALLENGE_MAX_PER_IP_PER_10_MIN = 12;

/** Max signup challenges per IP per hour — stops bulk fake-account farms. */
export const SIGNUP_MAX_PER_IP_PER_HOUR = 4;

/** Hidden honeypot filled by bots; humans never see this field. */
export const AUTH_HONEYPOT_FIELD_MAX = 200;

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "mailinator.com",
  "mailinator.net",
  "yopmail.com",
  "yopmail.fr",
  "trashmail.com",
  "trashmail.net",
  "tempmail.com",
  "temp-mail.org",
  "tempmailo.com",
  "throwawaymail.com",
  "fakeinbox.com",
  "getnada.com",
  "nada.email",
  "mailnesia.com",
  "maildrop.cc",
  "discard.email",
  "dispostable.com",
  "emailondeck.com",
  "mintemail.com",
  "mytemp.email",
  "tempail.com",
  "moakt.com",
  "guerrillamail.org",
  "spamgourmet.com",
  "inboxkitten.com",
  "getairmail.com",
  "mailcatch.com",
  "tmpmail.org",
  "tmpmail.net",
]);

export function emailDomain(email: string): string {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 0) return "";
  return email.trim().toLowerCase().slice(at + 1);
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return true;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Common plus-pattern throwaway hosts
  return (
    (domain.startsWith("temp") && domain.includes("mail")) ||
    domain.includes("throwaway") ||
    domain.includes("trashmail") ||
    domain.includes("guerrillamail")
  );
}
