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

const GEMINI_API_MODEL = "gemini-1.5-flash";

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
  };
}

async function generateChatViaGeminiApiKey(
  safe: GoogleChatParams,
): Promise<GoogleChatResult> {
  const genAI = getGeminiApiClient();
  const userMessage = buildUserMessage(safe.message, safe.responseLanguage);

  const model = genAI.getGenerativeModel({
    model: GEMINI_API_MODEL,
    systemInstruction: safe.systemPrompt,
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    },
  });

  const history = safe.history.map((turn) => ({
    role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: turn.content }],
  }));

  if (history.length === 0) {
    const result = await model.generateContent(userMessage);
    const text = result.response.text()?.trim();
    if (!text) throw new InternalServiceError("EMPTY_RESPONSE");
    return { reply: text, model: GEMINI_API_MODEL };
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  const text = result.response.text()?.trim();
  if (!text) throw new InternalServiceError("EMPTY_RESPONSE");

  return { reply: text, model: GEMINI_API_MODEL };
}

async function generateChatViaVertex(safe: GoogleChatParams): Promise<GoogleChatResult> {
  const vertex = getVertexClient();
  const model = vertex.getGenerativeModel({
    model: ENV.googleGeminiModel,
    systemInstruction: {
      role: "system",
      parts: [{ text: safe.systemPrompt }],
    },
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
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
