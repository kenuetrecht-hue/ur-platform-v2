/** Absolute URLs allowed for hosted card checkout. */
export function isAllowedCheckoutUrl(url: string): boolean {
  return (
    /^https:\/\//i.test(url) ||
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1")
  );
}
