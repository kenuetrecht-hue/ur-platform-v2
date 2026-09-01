/**
 * Owner social publisher. Ayrshare and Buffer can both be configured, but
 * each network is sent through exactly one of them — never both.
 */

import { createHash } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  SOCIAL_NETWORKS,
  SOCIAL_ROUTE_ENV,
  isSocialPublisherId,
  type SocialNetwork,
  type SocialPublisherId,
} from "../../lib/social-publisher-types";
import { sanitizeUserText } from "./input-sanitize";
import { assertNoAiTakeoverInMessage } from "./ai-control";
import { isAyrshareConfigured, listAyrshareLinkedNetworks, postViaAyrshare } from "./ayrshare-client";
import { isBufferConfigured, isBufferConfiguredFor, postViaBuffer } from "./buffer-client";

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type NetworkRouteStatus = {
  network: SocialNetwork;
  publisher: SocialPublisherId | null;
  ready: boolean;
  reason: string;
};

export type SocialPublisherStatus = {
  ayrshareConfigured: boolean;
  ayrshareBusinessReady: boolean;
  ayrshareLinkedNetworks: string[];
  bufferConfigured: boolean;
  mode: "none" | "ayrshare" | "buffer" | "split";
  networks: NetworkRouteStatus[];
  note: string;
  setupNeeded: string | null;
};

export type PublishedNetworkResult = {
  network: SocialNetwork;
  publisher: SocialPublisherId;
  ok: boolean;
  remoteId: string | null;
  error: string | null;
};

type RecentPost = { at: number; publisher: SocialPublisherId };

const recentFingerprints = new Map<string, RecentPost>();
let fetchImpl: typeof fetch | undefined;

export function _setSocialPublisherFetchForTests(fn: typeof fetch | null): void {
  fetchImpl = fn ?? undefined;
}

export function _resetSocialPublisherForTests(): void {
  recentFingerprints.clear();
  fetchImpl = undefined;
}

function readRouteOverride(network: SocialNetwork): SocialPublisherId | null {
  const raw = process.env[SOCIAL_ROUTE_ENV[network]]?.trim().toLowerCase() ?? "";
  return isSocialPublisherId(raw) ? raw : null;
}

function fingerprint(network: SocialNetwork, body: string): string {
  return createHash("sha256").update(`${network}\n${body}`).digest("hex").slice(0, 32);
}

function pruneRecent(now = Date.now()): void {
  for (const [key, value] of recentFingerprints) {
    if (now - value.at > DUPLICATE_WINDOW_MS) recentFingerprints.delete(key);
  }
}

export function resolveNetworkRoute(network: SocialNetwork): NetworkRouteStatus {
  const override = readRouteOverride(network);
  const ayrshareOk = isAyrshareConfigured();
  const bufferOk = isBufferConfiguredFor(network);

  if (override === "ayrshare") {
    if (!ayrshareOk) {
      return {
        network,
        publisher: "ayrshare",
        ready: false,
        reason: "SOCIAL_ROUTE is Ayrshare, but AYRSHARE_API_KEY is not set.",
      };
    }
    return { network, publisher: "ayrshare", ready: true, reason: "Forced to Ayrshare." };
  }

  if (override === "buffer") {
    if (!bufferOk) {
      return {
        network,
        publisher: "buffer",
        ready: false,
        reason: `SOCIAL_ROUTE is Buffer, but BUFFER_ACCESS_TOKEN or the ${network} profile id is missing.`,
      };
    }
    return { network, publisher: "buffer", ready: true, reason: "Forced to Buffer." };
  }

  if (ayrshareOk && bufferOk) {
    return {
      network,
      publisher: null,
      ready: false,
      reason: `Both Ayrshare and Buffer can post to ${network}. Set ${SOCIAL_ROUTE_ENV[network]}=ayrshare or buffer so they never double-post.`,
    };
  }

  if (ayrshareOk) {
    return { network, publisher: "ayrshare", ready: true, reason: "Ayrshare only." };
  }

  if (bufferOk) {
    return { network, publisher: "buffer", ready: true, reason: "Buffer only." };
  }

  if (isBufferConfigured() && !bufferOk) {
    return {
      network,
      publisher: null,
      ready: false,
      reason: `Buffer is connected, but no profile id for ${network}.`,
    };
  }

  return {
    network,
    publisher: null,
    ready: false,
    reason: "Neither Ayrshare nor Buffer is ready for this network.",
  };
}

export async function getSocialPublisherStatus(): Promise<SocialPublisherStatus> {
  const networks = SOCIAL_NETWORKS.map(resolveNetworkRoute);
  const readyPublishers = new Set(
    networks.filter((n) => n.ready && n.publisher).map((n) => n.publisher as SocialPublisherId),
  );
  const mode: SocialPublisherStatus["mode"] =
    readyPublishers.size === 0
      ? "none"
      : readyPublishers.size === 2
        ? "split"
        : readyPublishers.has("ayrshare")
          ? "ayrshare"
          : "buffer";

  const ayrshareLinkedNetworks = isAyrshareConfigured()
    ? await listAyrshareLinkedNetworks(fetchImpl ?? fetch)
    : [];

  let setupNeeded: string | null = null;
  if (isAyrshareConfigured() && ayrshareLinkedNetworks.length === 0) {
    setupNeeded =
      "Ayrshare key is on, but no social accounts are linked yet. Open app.ayrshare.com → Social Accounts and connect Facebook, Instagram, X, LinkedIn, TikTok, or YouTube.";
  }

  return {
    ayrshareConfigured: isAyrshareConfigured(),
    ayrshareBusinessReady: Boolean(process.env.AYRSHARE_PROFILE_KEY?.trim()),
    ayrshareLinkedNetworks,
    bufferConfigured: isBufferConfigured(),
    mode,
    networks,
    note: "Each network uses one publisher — never both. Personal plans post only to your linked accounts. Creator/affiliate posting waits for Ayrshare Business.",
    setupNeeded,
  };
}

export function logSocialPublisherStartup(): void {
  void getSocialPublisherStatus().then((status) => {
    const ready = status.networks.filter((n) => n.ready).map((n) => `${n.network}:${n.publisher}`);
    console.log(
      `[social] Publishers: Ayrshare ${status.ayrshareConfigured ? "configured" : "not configured"} (${status.ayrshareLinkedNetworks.length} linked) · Buffer ${status.bufferConfigured ? "configured" : "not configured"} · ready ${ready.length ? ready.join(", ") : "none"}`,
    );
  });
}

export async function publishOwnerSocialPost(params: {
  body: string;
  platforms: SocialNetwork[];
  scheduledAt?: Date;
}): Promise<{ results: PublishedNetworkResult[]; mode: SocialPublisherStatus["mode"] }> {
  const body = sanitizeUserText(params.body, 2200);
  if (body.length < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Write the post first." });
  }
  assertNoAiTakeoverInMessage(body, true);

  const platforms = [...new Set(params.platforms)];
  if (platforms.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick at least one network." });
  }

  pruneRecent();
  const routes = platforms.map((network) => {
    const route = resolveNetworkRoute(network);
    if (!route.ready || !route.publisher) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: route.reason });
    }
    const key = fingerprint(network, body);
    const prior = recentFingerprints.get(key);
    if (prior) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `That exact ${network} post already went out through ${prior.publisher} in the last 24 hours. Change the text or wait so it is not posted twice.`,
      });
    }
    return route;
  });

  const byPublisher = new Map<SocialPublisherId, SocialNetwork[]>();
  for (const route of routes) {
    const publisher = route.publisher!;
    const list = byPublisher.get(publisher) ?? [];
    list.push(route.network);
    byPublisher.set(publisher, list);
  }

  const results: PublishedNetworkResult[] = [];

  const ayrshareNetworks = byPublisher.get("ayrshare") ?? [];
  if (ayrshareNetworks.length > 0) {
    try {
      const posted = await postViaAyrshare({
        body,
        platforms: ayrshareNetworks,
        scheduledAt: params.scheduledAt,
        fetchImpl,
      });
      for (const network of ayrshareNetworks) {
        recentFingerprints.set(fingerprint(network, body), {
          at: Date.now(),
          publisher: "ayrshare",
        });
        results.push({
          network,
          publisher: "ayrshare",
          ok: true,
          remoteId: posted.id,
          error: null,
        });
      }
    } catch {
      for (const network of ayrshareNetworks) {
        results.push({
          network,
          publisher: "ayrshare",
          ok: false,
          remoteId: null,
          error: "Ayrshare could not send that post. Check the key and linked accounts.",
        });
      }
    }
  }

  for (const network of byPublisher.get("buffer") ?? []) {
    try {
      const posted = await postViaBuffer({
        body,
        network,
        scheduledAt: params.scheduledAt,
        fetchImpl,
      });
      recentFingerprints.set(fingerprint(network, body), {
        at: Date.now(),
        publisher: "buffer",
      });
      results.push({
        network,
        publisher: "buffer",
        ok: true,
        remoteId: posted.id,
        error: null,
      });
    } catch {
      results.push({
        network,
        publisher: "buffer",
        ok: false,
        remoteId: null,
        error: "Buffer could not send that post. Check the token and profile id.",
      });
    }
  }

  if (results.every((r) => !r.ok)) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: results[0]?.error ?? "Social publishers could not send that post.",
    });
  }

  return { results, mode: getSocialPublisherStatus().mode };
}
