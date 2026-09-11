import { TRPCError } from "@trpc/server";
import type { TurnstileAction } from "../../lib/turnstile";
import { TURNSTILE_TOKEN_MAX_LENGTH } from "../../lib/turnstile";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function getTurnstileSecretKey(): string {
  return process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
}

export function getTurnstilePublicSiteKey(): string {
  return (
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    ""
  );
}

/** Only when both Cloudflare keys exist. A missing key must not block login or ID check. */
export function isTurnstileEnforced(): boolean {
  return getTurnstileSecretKey().length > 0 && getTurnstilePublicSiteKey().length > 0;
}

export function getTurnstileClientConfig(): {
  required: boolean;
  siteKey: string | null;
} {
  const siteKey = getTurnstilePublicSiteKey();
  const ready = isTurnstileEnforced();
  return {
    required: ready,
    siteKey: ready && siteKey.length > 0 ? siteKey : null,
  };
}

type SiteverifyResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export async function assertTurnstileToken(params: {
  token: string | undefined;
  action: TurnstileAction;
  ip?: string;
}): Promise<void> {
  if (!isTurnstileEnforced()) return;

  const secret = getTurnstileSecretKey();
  if (!secret) return;

  const token = params.token?.trim() ?? "";
  if (token.length < 20 || token.length > TURNSTILE_TOKEN_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Complete the security check and try again.",
    });
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (params.ip && params.ip !== "unknown") {
    body.set("remoteip", params.ip);
  }

  let payload: SiteverifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    payload = (await response.json()) as SiteverifyResponse;
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Security check could not be completed. Try again.",
    });
  }

  if (!payload.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Security check failed. Refresh the page and try again.",
    });
  }

  if (payload.action && payload.action !== params.action) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Security check failed. Refresh the page and try again.",
    });
  }
}
