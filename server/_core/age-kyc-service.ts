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
  isAdultAge,
  type AgeKycDocumentType,
  type AgeKycMimeType,
  type AgeKycStatus,
} from "../../lib/age-kyc-policy";
import * as db from "../db";
import { generateGoogleChatReply } from "./google-ai";
import { ENV } from "./env";
import { markCreatorIdentityVerified } from "./creator-content-protection-service";
import { isDevAgeKycBypassEnabled } from "../../lib/dev-age-kyc-mode";

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
const FACE_MATCH_MIN = 75;
const MAX_ATTEMPTS_PER_DAY = 8;

const KYC_SYSTEM_PROMPT = `You are an age-verification checker for UR Platform LLC.
Adults 18+ only. You inspect photos of a government ID and a selfie.

Return ONLY compact JSON with these keys:
- isGovernmentIdFront: boolean (true if image is the front of a real government photo ID: driver license, state ID, passport data page, or national ID)
- isGovernmentIdBack: boolean (true if image is the back of that ID, or passport MRZ/barcode page)
- dateOfBirth: string YYYY-MM-DD or null if unreadable
- documentExpired: boolean
- faceMatch: boolean (selfie is the same person as the ID portrait)
- faceMatchScore: number 0-100
- selfieLooksLive: boolean (a live person photo, not a photo-of-a-photo of the ID)
- rejectionReasons: string[] short reasons if anything fails

Rules:
- Never copy ID numbers, document numbers, addresses, or full MRZ into the JSON.
- If you cannot read a date of birth, set dateOfBirth to null.
- If the selfie is a picture of the ID instead of a face, faceMatch is false.
- Be conservative. When unsure, fail.`;

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
  return value === true;
}

function asScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function asDob(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
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
  if (attempts >= MAX_ATTEMPTS_PER_DAY) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many ID checks today. Try again tomorrow or email support if a real adult ID was rejected.",
    });
  }

  const front = assertPhoto(params.idFront, "ID front");
  const back = assertPhoto(params.idBack, "ID back");
  const selfie = assertPhoto(params.selfie, "Selfie");

  const hashes = {
    front: sha256(front.base64),
    back: sha256(back.base64),
    selfie: sha256(selfie.base64),
  };

  let idAnalysis: Record<string, unknown>;
  let faceAnalysis: Record<string, unknown>;
  try {
    const idReply = await generateGoogleChatReply({
      systemPrompt: KYC_SYSTEM_PROMPT,
      history: [],
      message: `Document type claimed: ${params.documentType}. Image 1 is ID FRONT. Image 2 is ID BACK. Extract date of birth. Do not output ID numbers.`,
      temperature: 0.1,
      maxOutputTokens: 400,
      attachments: [
        { mimeType: front.mimeType, base64: front.base64 },
        { mimeType: back.mimeType, base64: back.base64 },
      ],
    });
    idAnalysis = parseModelJson(idReply.reply);

    const faceReply = await generateGoogleChatReply({
      systemPrompt: KYC_SYSTEM_PROMPT,
      history: [],
      message:
        "Image 1 is the ID FRONT portrait. Image 2 is a live SELFIE. Decide if they are the same person. Do not output ID numbers.",
      temperature: 0.1,
      maxOutputTokens: 400,
      attachments: [
        { mimeType: front.mimeType, base64: front.base64 },
        { mimeType: selfie.mimeType, base64: selfie.base64 },
      ],
    });
    faceAnalysis = parseModelJson(faceReply.reply);
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: AGE_KYC_ID_UNREADABLE_MESSAGE,
    });
  }

  const reasons: string[] = [];
  if (!asBool(idAnalysis.isGovernmentIdFront)) reasons.push("Front photo is not a government photo ID.");
  if (!asBool(idAnalysis.isGovernmentIdBack)) reasons.push("Back photo is not the back of a government ID.");
  if (asBool(idAnalysis.documentExpired)) reasons.push("The ID appears expired.");

  const dob = asDob(idAnalysis.dateOfBirth);
  const age = dob ? ageFromIsoDate(dob) : null;
  if (!dob || age == null) {
    reasons.push(AGE_KYC_ID_UNREADABLE_MESSAGE);
  } else if (!isAdultAge(age)) {
    reasons.push(AGE_KYC_UNDERAGE_MESSAGE);
  }

  const faceScore = asScore(faceAnalysis.faceMatchScore);
  const faceOk = asBool(faceAnalysis.faceMatch) && asBool(faceAnalysis.selfieLooksLive) && faceScore >= FACE_MATCH_MIN;
  if (!faceOk) reasons.push(AGE_KYC_MISMATCH_MESSAGE);

  const extra = [
    ...(Array.isArray(idAnalysis.rejectionReasons) ? idAnalysis.rejectionReasons : []),
    ...(Array.isArray(faceAnalysis.rejectionReasons) ? faceAnalysis.rejectionReasons : []),
  ]
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, 120));
  reasons.push(...extra);

  const uniqueReasons = [...new Set(reasons)].slice(0, 6);
  const verified = uniqueReasons.length === 0 && isAdultAge(age);

  const next: MemoryKyc = {
    status: verified ? "verified" : "rejected",
    verified,
    rejectionReason: verified ? null : uniqueReasons[0] ?? AGE_KYC_REQUIRED_MESSAGE,
    attempts: attempts + 1,
    lastAttemptAt: Date.now(),
  };

  await persist(params.userId, next, hashes);
  if (verified) {
    markCreatorIdentityVerified(String(params.userId));
  }
  return publicStatusFromMemory(next);
}

/** Test helper */
export function resetAgeKycMemoryForTests(): void {
  memoryByUserId.clear();
}
