import { generateImagenImages, isGoogleCloudAiConfigured } from "./google-ai";
import { sanitizeModelPrompt } from "./input-sanitize";
import { InternalServiceError } from "./service-errors";
import { storagePut } from "../storage";

export type GenerateImageOptions = {
  prompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  negativePrompt?: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
  model?: string;
};

export async function generateImage(
  options: GenerateImageOptions,
): Promise<GenerateImageResponse> {
  if (!isGoogleCloudAiConfigured()) {
    throw new InternalServiceError("NOT_CONFIGURED");
  }

  const prompt = sanitizeModelPrompt(options.prompt);
  if (!prompt) {
    throw new InternalServiceError("UPSTREAM_FAILED");
  }

  const { images, model } = await generateImagenImages({
    prompt,
    aspectRatio: options.aspectRatio ?? "1:1",
    negativePrompt: options.negativePrompt,
    sampleCount: 1,
  });

  const first = images[0];
  const buffer = Buffer.from(first.base64, "base64");
  const ext = first.mimeType.includes("jpeg") ? "jpg" : "png";
  const { url } = await storagePut(
    `generated/${Date.now()}.${ext}`,
    buffer,
    first.mimeType,
  );

  return { url, model };
}
