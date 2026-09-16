/** Captures Chrome/Edge `beforeinstallprompt` as soon as the website loads. */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const subs = new Set<() => void>();

function notify(): void {
  subs.forEach((fn) => fn());
}

export function subscribeWebInstallPrompt(listener: () => void): () => void {
  subs.add(listener);
  return () => {
    subs.delete(listener);
  };
}

export function getCapturedInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function isWebAppInstalled(): boolean {
  return installed || readStandalone();
}

export function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia?.("(display-mode: standalone)");
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return Boolean(media?.matches || iosStandalone);
}

function onPrompt(event: Event): void {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  notify();
}

function onInstalled(): void {
  installed = true;
  deferred = null;
  notify();
}

export function captureWebInstallPrompt(): void {
  if (typeof window === "undefined") return;
  const flag = window as Window & { __urInstallCapture?: boolean };
  if (flag.__urInstallCapture) return;
  flag.__urInstallCapture = true;
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
}

export function clearCapturedInstallPrompt(): void {
  deferred = null;
  notify();
}

if (typeof window !== "undefined") {
  captureWebInstallPrompt();
}
