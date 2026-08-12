import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAuth } from "google-auth-library";
import { VertexAI, type GenerateContentResult } from "@google-cloud/vertexai";
import { sanitizeLanguageLabel, sanitizeModelPrompt, sanitizeUserText } from "./input-sanitize";
import { InternalServiceError } from "./service-errors";
import { ENV } from "./env";
import {
  getContentmateGeminiApiKey,
  isContentmateGeminiConfigured,
} from "./secrets";

export type GoogleChatRole = "user" | "assistant";

export type GoogleChatTurn = {
  role: GoogleChatRole;
  content: string;
};

export type GoogleChatParams = {
  /** Server-side prompt only — never pass client-supplied system prompts. */
  systemPrompt: string;
  history: GoogleChatTurn[];
  message: string;
  responseLanguage?: string;
  /** Optional cap for short public demos — server-controlled only. */
  maxOutputTokens?: number;
  temperature?: number;
};

export type GoogleChatResult = {
  reply: string;
  model: string;
};

export type ImagenGenerateParams = {
  prompt: string;
  sampleCount?: number;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  negativePrompt?: string;
};

export type ImagenGenerateResult = {
  images: Array<{ base64: string; mimeType: string }>;
  model: string;
};

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_TURNS = 30;
const MAX_PROMPT_LENGTH = 2000;

/** Models to try in order when using the Gemini API key (Vertex uses ENV.googleGeminiModel only). */
function geminiApiModelCandidates(): string[] {
  const primary = ENV.googleGeminiModel;
  const fallbacks = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];
  return [...new Set([primary, ...fallbacks])];
}

function geminiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isGeminiRateLimitError(error: unknown): boolean {
  return /429|too many requests|quota|rate.limit|resource.exhausted/i.test(geminiErrorMessage(error));
}

function isGeminiModelNotFoundError(error: unknown): boolean {
  return /404|not found for api version|is not supported for generatecontent/i.test(
    geminiErrorMessage(error),
  );
}

function logGeminiError(error: unknown): void {
  if (ENV.isProduction) return;
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[google-ai] Gemini API error:", msg.slice(0, 400));
}

function isGeminiAuthError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /401|403|invalid authentication|api key not valid|permission_denied|unauthorized/i.test(msg);
}

function wrapGeminiUpstreamError(error: unknown): InternalServiceError {
  logGeminiError(error);
  if (isGeminiAuthError(error)) {
    return new InternalServiceError("INVALID_API_KEY");
  }
  if (isGeminiRateLimitError(error)) {
    return new InternalServiceError("RATE_LIMITED");
  }
  const detail = error instanceof Error ? error.message.slice(0, 120) : undefined;
  return new InternalServiceError("UPSTREAM_FAILED", detail);
}

export type AiHealthStatus = {
  configured: boolean;
  reachable: boolean;
  model?: string;
  hint?: string;
};

let cachedAiHealth: { at: number; status: AiHealthStatus } | null = null;
const AI_HEALTH_TTL_MS = 60_000;

/** After a 429, skip live Gemini calls briefly so retries don't burn quota across models. */
let geminiQuotaBlockedUntil = 0;
const GEMINI_QUOTA_COOLDOWN_MS = 120_000;
const GEMINI_RATE_LIMIT_RETRY_MS = 5_000;

function isGeminiQuotaBlocked(): boolean {
  return Date.now() < geminiQuotaBlockedUntil;
}

function markGeminiQuotaBlocked(): void {
  geminiQuotaBlockedUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lightweight probe — cached 60s. Used by /api/health and startup logs. */
export async function getAiHealthStatus(force = false): Promise<AiHealthStatus> {
  if (!force && cachedAiHealth && Date.now() - cachedAiHealth.at < AI_HEALTH_TTL_MS) {
    return cachedAiHealth.status;
  }

  if (!isGoogleCloudAiConfigured()) {
    const status: AiHealthStatus = {
      configured: false,
      reachable: false,
      hint: "Set CONTENTMATE_GEMINI_API_KEY in .env (from https://aistudio.google.com/apikey).",
    };
    cachedAiHealth = { at: Date.now(), status };
    return status;
  }

  if (!useGeminiApiKey()) {
    const status: AiHealthStatus = {
      configured: true,
      reachable: true,
      hint: "Using Vertex AI (GOOGLE_CLOUD_PROJECT).",
    };
    cachedAiHealth = { at: Date.now(), status };
    return status;
  }

  // Dev: don't probe Gemini on every /api/health — it burns free-tier quota.
  if (!ENV.isProduction && !force) {
    const status: AiHealthStatus = {
      configured: true,
      reachable: true,
      model: ENV.googleGeminiModel,
    };
    cachedAiHealth = { at: Date.now(), status };
    return status;
  }

  try {
    const result = await generateChatViaGeminiApiKey({
      systemPrompt: "Reply briefly.",
      history: [],
      message: 'Say exactly: "ok"',
    });
    const status: AiHealthStatus = {
      configured: true,
      reachable: true,
      model: result.model,
    };
    cachedAiHealth = { at: Date.now(), status };
    return status;
  } catch (error) {
    if (error instanceof InternalServiceError && error.code === "RATE_LIMITED") {
      const status: AiHealthStatus = {
        configured: true,
        reachable: false,
        hint:
          "Gemini quota/rate limit hit (429). Wait 1–2 minutes, then try chat again. " +
          "Check usage: https://ai.dev/rate-limit",
      };
      cachedAiHealth = { at: Date.now(), status };
      return status;
    }
    const status: AiHealthStatus = isGeminiAuthError(error)
      ? {
          configured: true,
          reachable: false,
          hint:
            "Gemini API key rejected. Verify CONTENTMATE_GEMINI_API_KEY in .env " +
            "(from https://aistudio.google.com/apikey), save, then restart pnpm dev.",
        }
      : {
          configured: true,
          reachable: false,
          hint: "Gemini request failed. Check terminal [google-ai] logs.",
        };
    cachedAiHealth = { at: Date.now(), status };
    return status;
  }
}

export async function logGeminiStartupCheck(): Promise<void> {
  if (!ENV.isProduction && isContentmateGeminiConfigured()) {
    // Skip live probe on boot — it burns quota and retries amplify 429s.
    console.log(
      `[google-ai] API key configured (model: ${ENV.googleGeminiModel}). Chat connects on first message.`,
    );
    return;
  }
  if (!ENV.isProduction && ENV.googleCloudProject) {
    console.log("[google-ai] Using Vertex AI project:", ENV.googleCloudProject);
  }
}

let vertexClient: VertexAI | null = null;
let googleAuth: GoogleAuth | null = null;
let geminiApiClient: GoogleGenerativeAI | null = null;

function useGeminiApiKey(): boolean {
  return isContentmateGeminiConfigured();
}

function assertVertexConfigured(): void {
  if (!ENV.googleCloudProject) {
    throw new InternalServiceError("NOT_CONFIGURED");
  }
}

function assertChatConfigured(): void {
  if (!useGeminiApiKey() && !ENV.googleCloudProject) {
    throw new InternalServiceError("NOT_CONFIGURED");
  }
}

function getGeminiApiClient(): GoogleGenerativeAI {
  const apiKey = getContentmateGeminiApiKey();
  if (!apiKey) {
    throw new InternalServiceError("NOT_CONFIGURED");
  }
  if (!geminiApiClient) {
    geminiApiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiApiClient;
}

function getVertexClient(): VertexAI {
  assertVertexConfigured();

  if (!vertexClient) {
    vertexClient = new VertexAI({
      project: ENV.googleCloudProject,
      location: ENV.googleCloudLocation,
    });
  }

  return vertexClient;
}

function getGoogleAuth(): GoogleAuth {
  if (!googleAuth) {
    googleAuth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  return googleAuth;
}

async function getAccessToken(): Promise<string> {
  const client = await getGoogleAuth().getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new InternalServiceError("NOT_CONFIGURED");
  }
  return token.token;
}

function extractVertexReplyText(result: GenerateContentResult): string {
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new InternalServiceError("EMPTY_RESPONSE");
  }

  return text;
}

function buildUserMessage(message: string, responseLanguage?: string): string {
  if (!responseLanguage) return message;
  const lang = sanitizeLanguageLabel(responseLanguage);
  if (!lang) return message;
  return `${message}\n\n[Respond in ${lang}]`;
}

function sanitizeParams(params: GoogleChatParams): GoogleChatParams {
  const maxOutputTokens =
    params.maxOutputTokens != null
      ? Math.min(Math.max(Math.floor(params.maxOutputTokens), 16), 8192)
      : undefined;
  const temperature =
    params.temperature != null
      ? Math.min(Math.max(params.temperature, 0), 2)
      : undefined;

  return {
    systemPrompt: params.systemPrompt,
    message: sanitizeUserText(params.message, MAX_MESSAGE_LENGTH),
    responseLanguage: params.responseLanguage
      ? sanitizeLanguageLabel(params.responseLanguage)
      : undefined,
    history: params.history.slice(-MAX_HISTORY_TURNS).map((turn) => ({
      role: turn.role,
      content: sanitizeUserText(turn.content, MAX_MESSAGE_LENGTH),
    })),
    maxOutputTokens,
    temperature,
  };
}

async function generateChatViaGeminiApiKey(
  safe: GoogleChatParams,
): Promise<GoogleChatResult> {
  if (isGeminiQuotaBlocked()) {
    throw new InternalServiceError("RATE_LIMITED");
  }

  const genAI = getGeminiApiClient();
  const userMessage = buildUserMessage(safe.message, safe.responseLanguage);

  let historyTurns = safe.history;
  while (historyTurns.length > 0 && historyTurns[0]?.role === "assistant") {
    historyTurns = historyTurns.slice(1);
  }

  const history = historyTurns.map((turn) => ({
    role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: turn.content }],
  }));

  const maxOutputTokens = safe.maxOutputTokens ?? (ENV.isProduction ? 4096 : 2048);
  const temperature = safe.temperature ?? 0.7;

  async function callModel(modelName: string): Promise<GoogleChatResult> {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: safe.systemPrompt,
      generationConfig: {
        maxOutputTokens,
        temperature,
      },
    });

    if (history.length === 0) {
      const result = await model.generateContent(userMessage);
      const text = result.response.text()?.trim();
      if (!text) throw new InternalServiceError("EMPTY_RESPONSE");
      return { reply: text, model: modelName };
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userMessage);
    const text = result.response.text()?.trim();
    if (!text) throw new InternalServiceError("EMPTY_RESPONSE");
    return { reply: text, model: modelName };
  }

  let lastError: unknown;
  for (const modelName of geminiApiModelCandidates()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callModel(modelName);
      } catch (error) {
        if (error instanceof InternalServiceError) throw error;
        lastError = error;

        if (isGeminiRateLimitError(error)) {
          if (attempt === 0) {
            await sleep(GEMINI_RATE_LIMIT_RETRY_MS);
            continue;
          }
          markGeminiQuotaBlocked();
          throw wrapGeminiUpstreamError(error);
        }

        if (isGeminiAuthError(error)) {
          throw wrapGeminiUpstreamError(error);
        }

        if (isGeminiModelNotFoundError(error)) {
          break;
        }

        logGeminiError(error);
        break;
      }
    }
  }

  throw wrapGeminiUpstreamError(lastError);
}

async function generateChatViaVertex(safe: GoogleChatParams): Promise<GoogleChatResult> {
  const vertex = getVertexClient();
  const maxOutputTokens = safe.maxOutputTokens ?? 4096;
  const temperature = safe.temperature ?? 0.7;
  const model = vertex.getGenerativeModel({
    model: ENV.googleGeminiModel,
    systemInstruction: {
      role: "system",
      parts: [{ text: safe.systemPrompt }],
    },
    generationConfig: {
      maxOutputTokens,
      temperature,
    },
  });

  const userMessage = buildUserMessage(safe.message, safe.responseLanguage);

  const history = safe.history.map((turn) => ({
    role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: turn.content }],
  }));

  if (history.length === 0) {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
    });
    return {
      reply: extractVertexReplyText(result),
      model: ENV.googleGeminiModel,
    };
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);

  return {
    reply: extractVertexReplyText(result),
    model: ENV.googleGeminiModel,
  };
}

export async function generateGoogleChatReply(
  params: GoogleChatParams,
): Promise<GoogleChatResult> {
  assertChatConfigured();
  const safe = sanitizeParams(params);

  if (useGeminiApiKey()) {
    return generateChatViaGeminiApiKey(safe);
  }

  return generateChatViaVertex(safe);
}

export async function generateImagenImages(
  params: ImagenGenerateParams,
): Promise<ImagenGenerateResult> {
  assertVertexConfigured();

  const prompt = sanitizeModelPrompt(params.prompt, MAX_PROMPT_LENGTH);
  const sampleCount = Math.min(Math.max(params.sampleCount ?? 1, 1), 4);

  const token = await getAccessToken();
  const endpoint =
    `https://${ENV.googleCloudLocation}-aiplatform.googleapis.com/v1/projects/` +
    `${ENV.googleCloudProject}/locations/${ENV.googleCloudLocation}/` +
    `publishers/google/models/${ENV.googleImagenModel}:predict`;

  const parameters: Record<string, unknown> = { sampleCount };
  if (params.aspectRatio) parameters.aspectRatio = params.aspectRatio;
  if (params.negativePrompt) {
    parameters.negativePrompt = sanitizeModelPrompt(params.negativePrompt, 500);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters,
    }),
  });

  if (!response.ok) {
    console.error(`[google-ai] Imagen upstream error: ${response.status}`);
    throw new InternalServiceError("UPSTREAM_FAILED");
  }

  const result = (await response.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
  };

  const images = (result.predictions ?? [])
    .filter((p) => p.bytesBase64Encoded)
    .map((p) => ({
      base64: p.bytesBase64Encoded!,
      mimeType: p.mimeType ?? "image/png",
    }));

  if (images.length === 0) {
    throw new InternalServiceError("EMPTY_RESPONSE");
  }

  return { images, model: ENV.googleImagenModel };
}

export function isGoogleCloudAiConfigured(): boolean {
  return useGeminiApiKey() || Boolean(ENV.googleCloudProject);
}
