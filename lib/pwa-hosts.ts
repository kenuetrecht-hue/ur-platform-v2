/** Hosts where the home-screen wrap may register its service worker. */
export function isLivePwaHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host === "urplatform.llc" ||
    host === "www.urplatform.llc" ||
    host.endsWith(".up.railway.app")
  );
}
