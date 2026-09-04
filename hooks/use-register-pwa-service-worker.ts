import { useEffect } from "react";
import { Platform } from "react-native";

const PRODUCTION_HOSTS = new Set(["urplatform.llc", "www.urplatform.llc"]);

function ensureHeadLink(rel: string, href: string): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
}

function ensureHeadMeta(name: string, content: string): void {
  if (typeof document === "undefined") return;
  const existing = document.querySelector(`meta[name="${name}"]`);
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }
  const meta = document.createElement("meta");
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
}

/** Manifest + icons on every page. Service worker only on the live site (keeps Metro uncached). */
export function useRegisterPwaServiceWorker(): void {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof document === "undefined") return;

    ensureHeadLink("manifest", "/manifest.webmanifest");
    ensureHeadLink("apple-touch-icon", "/apple-touch-icon.png");
    ensureHeadMeta("theme-color", "#07080d");
    ensureHeadMeta("mobile-web-app-capable", "yes");
    ensureHeadMeta("apple-mobile-web-app-capable", "yes");
    ensureHeadMeta("apple-mobile-web-app-title", "UR");
    ensureHeadMeta("apple-mobile-web-app-status-bar-style", "black-translucent");

    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!PRODUCTION_HOSTS.has(window.location.hostname)) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Add to Home Screen still works without the worker.
    });
  }, []);
}
