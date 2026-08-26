import { useEffect, useId, useRef } from "react";
import { Platform, View, Text } from "react-native";
import type { TurnstileAction } from "@/lib/turnstile";
import { trpc } from "@/lib/trpc";

type Props = {
  action: TurnstileAction;
  onToken: (token: string) => void;
};

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme: "auto" | "light" | "dark";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

function getTurnstileApi(): TurnstileApi | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { turnstile?: TurnstileApi }).turnstile ?? null;
}

function loadTurnstileScript(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (getTurnstileApi()) return Promise.resolve();
  const existing = document.querySelector("script[data-ur-turnstile='1']");
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      if (getTurnstileApi()) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.urTurnstile = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load security check."));
    document.head.appendChild(script);
  });
}

function TurnstileWeb({ action, onToken, siteKey }: Props & { siteKey: string }) {
  const hostId = `ur-turnstile-${useId().replace(/:/g, "")}`;
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      await loadTurnstileScript();
      if (cancelled) return;
      const api = getTurnstileApi();
      const el = document.getElementById(hostId);
      if (!api || !el) return;
      if (widgetIdRef.current) {
        api.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      widgetIdRef.current = api.render(el, {
        sitekey: siteKey,
        action,
        theme: "auto",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };

    void mount();
    return () => {
      cancelled = true;
      const api = getTurnstileApi();
      if (api && widgetIdRef.current) {
        api.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, hostId, siteKey]);

  return <View nativeID={hostId} style={{ minHeight: 65, width: "100%", alignItems: "center" }} />;
}

/** Cloudflare Turnstile — site key is public; verification is server-side. */
export function TurnstileWidget({ action, onToken }: Props) {
  const config = trpc.auth.turnstileConfig.useQuery(undefined, { staleTime: 60_000 });
  const required = config.data?.required ?? false;
  const siteKey = config.data?.siteKey ?? "";

  useEffect(() => {
    if (config.isSuccess && !required) {
      onToken("");
    }
  }, [config.isSuccess, required, onToken]);

  if (config.isLoading) {
    return (
      <View style={{ minHeight: 24, justifyContent: "center" }}>
        <Text style={{ fontSize: 12, opacity: 0.7 }}>Loading security check…</Text>
      </View>
    );
  }

  if (!required) return null;

  if (!siteKey) {
    return (
      <Text style={{ fontSize: 12, color: "#c0392b" }}>
        Security check is not configured (missing Turnstile site key).
      </Text>
    );
  }

  if (Platform.OS !== "web") {
    return (
      <Text style={{ fontSize: 12, opacity: 0.8, lineHeight: 18 }}>
        Complete sign-in on the website (urplatform.llc) so Cloudflare Turnstile can run. Native
        apps will use the same check once opened in a browser.
      </Text>
    );
  }

  return <TurnstileWeb action={action} siteKey={siteKey} onToken={onToken} />;
}
