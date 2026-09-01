/**
 * Buffer personal GraphQL API (api.buffer.com).
 * The legacy REST API at api.bufferapp.com rejects personal keys.
 */

import { BUFFER_PROFILE_ENV, type SocialNetwork } from "../../lib/social-publisher-types";
import { getBufferAccessToken, getBufferProfileId } from "./secrets";
import { InternalServiceError } from "./service-errors";

const BUFFER_GQL_URL = "https://api.buffer.com";

type BufferChannel = { id: string; name: string; service: string };

export function isBufferConfigured(): boolean {
  return Boolean(getBufferAccessToken());
}

export function isBufferConfiguredFor(network: SocialNetwork): boolean {
  return isBufferConfigured() && Boolean(getBufferProfileId(BUFFER_PROFILE_ENV[network]));
}

function mapBufferService(service: string): SocialNetwork | null {
  const value = service.trim().toLowerCase();
  if (value === "x") return "twitter";
  if (
    value === "facebook" ||
    value === "instagram" ||
    value === "twitter" ||
    value === "linkedin" ||
    value === "tiktok" ||
    value === "youtube"
  ) {
    return value;
  }
  return null;
}

async function bufferGraphql<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  fetchImpl: typeof fetch,
): Promise<T> {
  const token = getBufferAccessToken();
  if (!token) throw new InternalServiceError("NOT_CONFIGURED");

  const response = await fetchImpl(BUFFER_GQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  if (response.status === 401 || response.status === 403) {
    throw new InternalServiceError("INVALID_API_KEY");
  }
  if (response.status === 429) throw new InternalServiceError("RATE_LIMITED");
  if (!response.ok) throw new InternalServiceError("UPSTREAM_FAILED");

  let json: { data?: T; errors?: Array<{ message?: string }> };
  try {
    json = JSON.parse(text) as { data?: T; errors?: Array<{ message?: string }> };
  } catch {
    throw new InternalServiceError("UPSTREAM_FAILED");
  }
  if (json.errors?.length) throw new InternalServiceError("UPSTREAM_FAILED");
  if (!json.data) throw new InternalServiceError("EMPTY_RESPONSE");
  return json.data;
}

export async function listBufferChannels(fetchImpl: typeof fetch = fetch): Promise<BufferChannel[]> {
  const account = await bufferGraphql<{
    account: { organizations: Array<{ id: string; name: string }> };
  }>("query { account { organizations { id name } } }", undefined, fetchImpl);

  const orgId =
    process.env.BUFFER_ORGANIZATION_ID?.trim() || account.account.organizations[0]?.id;
  if (!orgId) return [];

  const data = await bufferGraphql<{ channels: BufferChannel[] }>(
    `query GetChannels($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) { id name service }
    }`,
    { organizationId: orgId },
    fetchImpl,
  );
  return data.channels ?? [];
}

async function resolveBufferChannelId(
  network: SocialNetwork,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const fromEnv = getBufferProfileId(BUFFER_PROFILE_ENV[network]);
  if (fromEnv) return fromEnv;
  const channels = await listBufferChannels(fetchImpl);
  return channels.find((channel) => mapBufferService(channel.service) === network)?.id ?? null;
}

export async function postViaBuffer(params: {
  body: string;
  network: SocialNetwork;
  scheduledAt?: Date;
  fetchImpl?: typeof fetch;
}): Promise<{ id: string | null }> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const channelId = await resolveBufferChannelId(params.network, fetchImpl);
  if (!channelId) throw new InternalServiceError("NOT_CONFIGURED");

  const input: Record<string, unknown> = {
    text: params.body,
    channelId,
    schedulingType: "automatic",
    mode: params.scheduledAt ? "customScheduled" : "addToQueue",
  };
  if (params.scheduledAt) input.dueAt = params.scheduledAt.toISOString();

  const data = await bufferGraphql<{
    createPost:
      | { post?: { id?: string }; message?: string }
      | { message?: string };
  }>(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id } }
        ... on MutationError { message }
      }
    }`,
    { input },
    fetchImpl,
  );

  const payload = data.createPost as { post?: { id?: string }; message?: string };
  if (payload.message && !payload.post?.id) {
    throw new InternalServiceError("UPSTREAM_FAILED");
  }
  return { id: payload.post?.id ?? null };
}
