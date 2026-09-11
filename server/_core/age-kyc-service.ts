import { createHash } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  AGE_KYC_IMAGE_MAX_BYTES,
  AGE_KYC_MIME_TYPES,
  AGE_KYC_MIN_AGE,
  AGE_KYC_MISMATCH_MESSAGE,
  AGE_KYC_REQUIRED_MESSAGE,
  AGE_KYC_ID_UNREADABLE_MESSAGE,
  AGE_KYC_UNDERAGE_MESSAGE,
  ageFromIsoDate,
  findFlexibleDobInText,
  isAdultAge,
  parseFlexibleDob,
  type AgeKycDocumentType,
  type AgeKycMimeType,
  type AgeKycStatus,
} from "../../lib/age-kyc-policy";
import * as db from "../db";
import { generateGoogleChatReply, isGoogleCloudAiConfigured } from "./google-ai";
import { InternalServiceError } from "./service-errors";
import { ENV } from "./env";
import { markCreatorIdentityVerified } from "./creator-content-protection-service";
import { isDevAgeKycBypassEnabled } from "../../lib/dev-age-kyc-mode";
import { issueAgeKycPassToken, verifyAgeKycPassToken } from "./age-kyc-pass";

type PhotoInput = {
  mimeType: string;
  base64: string;
};

export type AgeKycPublicStatus = {
  required: true;
  minAge: number;
  status: AgeKycStatus;
  verified: boolean;
  rejectionReason: string | null;
  /** True only in local development when ID upload is skipped for testing. */
  devBypass?: boolean;
};

type MemoryKyc = {
  status: AgeKycStatus;
  verified: boolean;
  rejectionReason: string | null;
  attempts: number;
  lastAttemptAt: number;
};

const memoryByUserId = new Map<number, MemoryKyc>();
const memoryByGuestIp = new Map<string, { attempts: number; lastAttemptAt: number }>();
const FACE_MATCH_MIN = 70;
const MAX_ATTEMPTS_PER_DAY = 8;

const KYC_SYSTEM_PROMPT = `You are an age-verification checker for UR Platform LLC.
This is a lawful 18+ age gate. Inspect the photos and return JSON. Do not refuse the task.

Return ONLY compact JSON with these keys:
- isGovernmentIdFront: boolean (true if this is the front of a government photo ID: driver license, state ID, passport data page, or national ID)
- isGovernmentIdBack: boolean (true if this is an ID back: barcode, PDF417, magnetic stripe, state seal text, inventory number, or passport MRZ)
- dateOfBirth: string YYYY-MM-DD or null if the birth date cannot be read
- documentExpired: boolean
- faceMatch: boolean (selfie is the same person as the ID portrait)
- faceMatchScore: number 0-100
- selfieLooksLive: boolean (a live person photo, not a photo-of-a-photo of the ID)
- rejectionReasons: string[] only hard failures. Leave empty when the photo is usable.

Rules:
- Never copy ID numbers, document numbers, addresses, or full MRZ into the JSON.
- Dates on US IDs are often MM/DD/YYYY. Convert any readable birth date to YYYY-MM-DD.
- A slightly angled card still counts if the needed side is visible.
- Light glare is OK if the needed fields can still be read.
- The BACK of a US driver license or state ID usually has NO photo and NO birth date. A barcode or magnetic stripe is enough. That is a valid back.
- Read the birth date from the FRONT only. Never require a birth date on the back.
- If you cannot read a date of birth on the front, set dateOfBirth to null.
- If the selfie is a picture of the ID instead of a face, faceMatch is false.`;

function stripDataUrl(raw: string): string {
  const comma = raw.indexOf(",");
  if (raw.startsWith("data:") && comma >= 0) return raw.slice(comma + 1);
  return raw.replace(/\s/g, "");
}

function assertPhoto(photo: PhotoInput, label: string): { mimeType: AgeKycMimeType; base64: string } {
  const mimeType = photo.mimeType.trim().toLowerCase();
  if (!AGE_KYC_MIME_TYPES.includes(mimeType as AgeKycMimeType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} must be a JPEG, PNG, or WebP photo.`,
    });
  }
  const base64 = stripDataUrl(photo.base64);
  if (base64.length < 80) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} photo is missing.` });
  }
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > AGE_KYC_IMAGE_MAX_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} photo is too large (max 4 MB).`,
    });
  }
  return { mimeType: mimeType as AgeKycMimeType, base64 };
}

function sha256(base64: string): string {
  return createHash("sha256").update(base64).digest("hex").slice(0, 32);
}

function parseModelJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = fenced ? fenced[0] : trimmed;
  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: AGE_KYC_ID_UNREADABLE_MESSAGE,
    });
  }
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function asScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function asDob(value: unknown): string | null {
  if (typeof value === "string") {
    return parseFlexibleDob(value) ?? findFlexibleDobInText(value);
  }
  return null;
}

function dobFromAnalysis(analysis: Record<string, unknown>): string | null {
  for (const key of ["dateOfBirth", "dob", "birthDate", "birth_date", "date_of_birth"]) {
    const parsed = asDob(analysis[key]);
    if (parsed) return parsed;
  }
  return findFlexibleDobInText(JSON.stringify(analysis));
}

function publicStatusFromMemory(row: MemoryKyc | undefined): AgeKycPublicStatus {
  if (!row) {
    return {
      required: true,
      minAge: AGE_KYC_MIN_AGE,
      status: "none",
      verified: false,
      rejectionReason: null,
    };
  }
  return {
    required: true,
    minAge: AGE_KYC_MIN_AGE,
    status: row.status,
    verified: row.verified,
    rejectionReason: row.verified ? null : row.rejectionReason,
  };
}

async function persist(userId: number, row: MemoryKyc, hashes: { front: string; back: string; selfie: string }) {
  memoryByUserId.set(userId, row);
  try {
    const existing = await db.getKycVerification(userId);
    const payload = {
      ageVerified: row.verified,
      ageVerifiedAt: row.verified ? new Date() : undefined,
      idVerificationStatus: row.verified ? ("verified" as const) : ("rejected" as const),
      facialVerificationStatus: row.verified ? ("verified" as const) : ("rejected" as const),
      kycStatus: row.verified ? ("verified" as const) : ("rejected" as const),
      rejectionReason: row.rejectionReason,
      idFrontUrl: `hash:${hashes.front}`,
      idBackUrl: `hash:${hashes.back}`,
      selfieUrl: `hash:${hashes.selfie}`,
      idVerifiedAt: row.verified ? new Date() : undefined,
      facialVerifiedAt: row.verified ? new Date() : undefined,
    };
    if (existing) {
      await db.updateKycVerification(userId, payload);
    } else {
      await db.createKycVerification({
        userId,
        ...payload,
      });
    }
  } catch (error) {
    if (!ENV.isProduction) {
      console.warn("[age-kyc] database persist skipped", error instanceof Error ? error.message : "error");
    }
  }
}

export async function getAgeKycPublicStatus(userId: number): Promise<AgeKycPublicStatus> {
  if (isDevAgeKycBypassEnabled()) {
    return {
      required: true,
      minAge: AGE_KYC_MIN_AGE,
      status: "verified",
      verified: true,
      rejectionReason: null,
      devBypass: true,
    };
  }
  try {
    const row = await db.getKycVerification(userId);
    if (row?.kycStatus === "verified" && row.ageVerified) {
      memoryByUserId.set(userId, {
        status: "verified",
        verified: true,
        rejectionReason: null,
        attempts: 0,
        lastAttemptAt: Date.now(),
      });
      return {
        required: true,
        minAge: AGE_KYC_MIN_AGE,
        status: "verified",
        verified: true,
        rejectionReason: null,
      };
    }
    if (row?.kycStatus === "rejected") {
      const mem = memoryByUserId.get(userId);
      return {
        required: true,
        minAge: AGE_KYC_MIN_AGE,
        status: "rejected",
        verified: false,
        rejectionReason: row.rejectionReason ?? mem?.rejectionReason ?? AGE_KYC_REQUIRED_MESSAGE,
      };
    }
  } catch {
    /* fall through to memory */
  }
  return publicStatusFromMemory(memoryByUserId.get(userId));
}

export async function assertUserIsAgeVerified(userId: string | number): Promise<void> {
  const id = typeof userId === "number" ? userId : Number(userId);
  if (!Number.isFinite(id)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: AGE_KYC_REQUIRED_MESSAGE,
    });
  }
  const status = await getAgeKycPublicStatus(id);
  if (!status.verified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: AGE_KYC_REQUIRED_MESSAGE,
    });
  }
}

type AnalyzeResult = {
  verified: boolean;
  rejectionReason: string | null;
  hashes: { front: string; back: string; selfie: string };
};

function assertDailyAttempts(attempts: number): void {
  if (attempts >= MAX_ATTEMPTS_PER_DAY) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many ID checks today. Try again tomorrow or email support if a real adult ID was rejected.",
    });
  }
}

function guestAttemptsFor(ip: string): number {
  const key = ip.trim() || "unknown";
  const mem = memoryByGuestIp.get(key);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  if (!mem || mem.lastAttemptAt <= dayAgo) return 0;
  return mem.attempts;
}

function recordGuestAttempt(ip: string): void {
  const key = ip.trim() || "unknown";
  memoryByGuestIp.set(key, { attempts: guestAttemptsFor(key) + 1, lastAttemptAt: Date.now() });
}

async function analyzeAgeKycPhotos(params: {
  documentType: AgeKycDocumentType;
  idFront: PhotoInput;
  idBack: PhotoInput;
  selfie: PhotoInput;
}): Promise<AnalyzeResult> {
  const front = assertPhoto(params.idFront, "ID front");
  const back = assertPhoto(params.idBack, "ID back");
  const selfie = assertPhoto(params.selfie, "Selfie");

  const hashes = {
    front: sha256(front.base64),
    back: sha256(back.base64),
    selfie: sha256(selfie.base64),
  };

  if (isDevAgeKycBypassEnabled()) {
    return { verified: true, rejectionReason: null, hashes };
  }

  if (!isGoogleCloudAiConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The photo checker is not ready on the server yet. Try again in a few minutes.",
    });
  }

  let idAnalysis: Record<string, unknown>;
  let backAnalysis: Record<string, unknown>;
  let faceAnalysis: Record<string, unknown>;
  try {
    // One checker call — three sequential vision calls sit idle so long the live
    // website drops the response ("unable to transfer response from server").
    const reply = await generateGoogleChatReply({
      systemPrompt: KYC_SYSTEM_PROMPT,
      history: [],
      message: `Document type claimed: ${params.documentType}. Image 1 is the ID FRONT. Image 2 is the ID BACK. Image 3 is a live SELFIE. Read the printed birth date from the FRONT only (US cards often use MM/DD/YYYY). A barcode, PDF417 square, magnetic stripe, or official card reverse is a valid BACK even with no name, photo, or birth date. Decide if the selfie is the same person as the ID portrait. Do not output ID numbers.`,
      temperature: 0.1,
      maxOutputTokens: 1024,
      thinkingLevel: "MINIMAL",
      mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
      attachments: [
        { mimeType: front.mimeType, base64: front.base64 },
        { mimeType: back.mimeType, base64: back.base64 },
        { mimeType: selfie.mimeType, base64: selfie.base64 },
      ],
      responseJson: true,
    });
    const analysis = parseModelJson(reply.reply);
    idAnalysis = analysis;
    backAnalysis = analysis;
    faceAnalysis = analysis;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (error instanceof InternalServiceError && error.code === "RATE_LIMITED") {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "The photo checker is busy. Wait one minute, then tap Check my three pictures again.",
      });
    }
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: AGE_KYC_ID_UNREADABLE_MESSAGE,
    });
  }

  const reasons: string[] = [];
  if (!asBool(idAnalysis.isGovernmentIdFront)) reasons.push("Front photo is not a government photo ID.");
  if (!asBool(backAnalysis.isGovernmentIdBack)) reasons.push("Back photo is not the back of a government ID.");
  if (asBool(idAnalysis.documentExpired)) reasons.push("The ID appears expired.");

  const dob = dobFromAnalysis(idAnalysis);
  const age = dob ? ageFromIsoDate(dob) : null;
  if (!dob || age == null) {
    reasons.push(AGE_KYC_ID_UNREADABLE_MESSAGE);
  } else if (!isAdultAge(age)) {
    reasons.push(AGE_KYC_UNDERAGE_MESSAGE);
  }

  const hasFaceScore = faceAnalysis.faceMatchScore != null && faceAnalysis.faceMatchScore !== "";
  const faceScore = asScore(faceAnalysis.faceMatchScore);
  const faceOk =
    asBool(faceAnalysis.faceMatch) &&
    asBool(faceAnalysis.selfieLooksLive) &&
    (!hasFaceScore || faceScore >= FACE_MATCH_MIN);
  if (!faceOk) reasons.push(AGE_KYC_MISMATCH_MESSAGE);

  const uniqueReasons = [...new Set(reasons)].slice(0, 6);
  const verified = uniqueReasons.length === 0 && isAdultAge(age);
  return {
    verified,
    rejectionReason: verified ? null : uniqueReasons[0] ?? AGE_KYC_REQUIRED_MESSAGE,
    hashes,
  };
}

export type AgeKycPrecheckResult = {
  verified: boolean;
  rejectionReason: string | null;
  passToken: string | null;
};

export async function precheckAgeKyc(params: {
  ip?: string;
  documentType: AgeKycDocumentType;
  idFront: PhotoInput;
  idBack: PhotoInput;
  selfie: PhotoInput;
}): Promise<AgeKycPrecheckResult> {
  const ip = params.ip?.trim() || "unknown";
  assertDailyAttempts(guestAttemptsFor(ip));
  const analysis = await analyzeAgeKycPhotos(params);
  recordGuestAttempt(ip);
  return {
    verified: analysis.verified,
    rejectionReason: analysis.rejectionReason,
    passToken: analysis.verified ? issueAgeKycPassToken(analysis.hashes) : null,
  };
}

export async function claimAgeKycPass(params: {
  userId: number;
  passToken: string;
}): Promise<AgeKycPublicStatus> {
  const current = await getAgeKycPublicStatus(params.userId);
  if (current.verified) return current;

  const payload = verifyAgeKycPassToken(params.passToken);
  if (!payload) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The photo check expired. Take the three pictures again, then sign in.",
    });
  }

  const next: MemoryKyc = {
    status: "verified",
    verified: true,
    rejectionReason: null,
    attempts: 1,
    lastAttemptAt: Date.now(),
  };
  await persist(params.userId, next, {
    front: payload.front,
    back: payload.back,
    selfie: payload.selfie,
  });
  markCreatorIdentityVerified(String(params.userId));
  return publicStatusFromMemory(next);
}

export async function submitAgeKyc(params: {
  userId: number;
  documentType: AgeKycDocumentType;
  idFront: PhotoInput;
  idBack: PhotoInput;
  selfie: PhotoInput;
}): Promise<AgeKycPublicStatus> {
  const current = await getAgeKycPublicStatus(params.userId);
  if (current.verified) return current;

  const mem = memoryByUserId.get(params.userId);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const attempts = mem && mem.lastAttemptAt > dayAgo ? mem.attempts : 0;
  assertDailyAttempts(attempts);

  const analysis = await analyzeAgeKycPhotos(params);
  const next: MemoryKyc = {
    status: analysis.verified ? "verified" : "rejected",
    verified: analysis.verified,
    rejectionReason: analysis.rejectionReason,
    attempts: attempts + 1,
    lastAttemptAt: Date.now(),
  };

  await persist(params.userId, next, analysis.hashes);
  if (analysis.verified) {
    markCreatorIdentityVerified(String(params.userId));
  }
  return publicStatusFromMemory(next);
}

/** Test helper */
export function resetAgeKycMemoryForTests(): void {
  memoryByUserId.clear();
  memoryByGuestIp.clear();
}
