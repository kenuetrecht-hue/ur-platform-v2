/** Public legal pages Stripe and visitors can read without an account. */
export const PUBLIC_LEGAL_PATHS = [
  "terms",
  "privacy",
  "refunds",
  "cancellations",
  "contact",
] as const;

export type PublicLegalPath = (typeof PUBLIC_LEGAL_PATHS)[number];

export const PUBLIC_LEGAL_NAV = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refunds & Returns" },
  { href: "/cancellations", label: "Cancellations" },
  { href: "/contact", label: "Contact" },
] as const;

export function isPublicLegalRoute(segments: string[]): boolean {
  const root = segments[0];
  return PUBLIC_LEGAL_PATHS.includes(root as PublicLegalPath);
}
