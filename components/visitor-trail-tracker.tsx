import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { sanitizeTrailLabel, sanitizeTrailPath } from "@/lib/visitor-trail";
import { trpc } from "@/lib/trpc";

const VISITOR_ID_KEY = "ur-visitor-id";

function readVisitorId(): string | null {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) {
      return existing;
    }
    const created = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, created);
    return created;
  } catch {
    return null;
  }
}

function buttonLabel(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  if (target.closest("input, textarea, select, [contenteditable='true']")) return null;
  const control = target.closest("button, a, [role='button']");
  if (!control) return null;
  return sanitizeTrailLabel(control.getAttribute("aria-label") || control.textContent || "");
}

/**
 * Records pages, button presses, and time on a page for people who are not the owner.
 * Does not read typed text or address-bar tokens.
 */
export function VisitorTrailTracker() {
  const pathname = usePathname();
  const { isPlatformOwner, isLoading } = usePlatformOwner();
  const record = trpc.visitorTrail.record.useMutation();
  const sendRef = useRef(record.mutate);
  sendRef.current = record.mutate;
  const ownerRef = useRef(isPlatformOwner);
  ownerRef.current = isPlatformOwner;
  const enteredRef = useRef<{ path: string; at: number } | null>(null);
  const lastButtonRef = useRef<{ key: string; at: number } | null>(null);

  const send = (input: { kind: "page" | "button" | "dwell"; path: string; label?: string; seconds?: number }) => {
    if (ownerRef.current) return;
    const visitorId = readVisitorId();
    const path = sanitizeTrailPath(input.path);
    if (!visitorId || !path) return;
    sendRef.current({
      visitorId,
      kind: input.kind,
      path,
      label: input.label,
      seconds: input.seconds,
    });
  };

  useEffect(() => {
    if (Platform.OS !== "web" || isLoading || isPlatformOwner) return;
    const path = sanitizeTrailPath(pathname || "/");
    if (!path) return;

    const previous = enteredRef.current;
    if (previous && previous.path !== path) {
      const seconds = Math.round((Date.now() - previous.at) / 1000);
      if (seconds >= 2) send({ kind: "dwell", path: previous.path, label: "time on page", seconds });
    }
    enteredRef.current = { path, at: Date.now() };
    send({ kind: "page", path, label: "Opened this page" });
  }, [pathname, isLoading, isPlatformOwner]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const onClick = (event: MouseEvent) => {
      if (ownerRef.current) return;
      const label = buttonLabel(event.target);
      const path = sanitizeTrailPath(window.location.pathname);
      if (!label || !path) return;
      const key = `${path}\0${label}`;
      const now = Date.now();
      if (lastButtonRef.current?.key === key && now - lastButtonRef.current.at < 400) return;
      lastButtonRef.current = { key, at: now };
      send({ kind: "button", path, label });
    };

    const onHide = () => {
      const current = enteredRef.current;
      if (!current || ownerRef.current) return;
      const seconds = Math.round((Date.now() - current.at) / 1000);
      if (seconds < 2) return;
      send({ kind: "dwell", path: current.path, label: "time on page", seconds });
      enteredRef.current = { path: current.path, at: Date.now() };
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return null;
}
