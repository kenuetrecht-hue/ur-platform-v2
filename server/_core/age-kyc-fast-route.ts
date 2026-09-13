import type { Express, Request, Response } from "express";
import multer from "multer";
import { TRPCError } from "@trpc/server";
import { checkIpNamespaceLimit, getClientIp, isIpBlocked } from "./api-security";
import { assertTurnstileToken } from "./turnstile";
import { precheckAgeKyc, precheckIdDocument, precheckSelfieMatch } from "./age-kyc-service";
import { sniffAgeKycImageMime } from "./age-kyc-image-sniff";
import { AGE_KYC_IMAGE_MAX_BYTES, type AgeKycDocumentType } from "../../lib/age-kyc-policy";

const DOC_TYPES: AgeKycDocumentType[] = [
  "driver_license",
  "state_id",
  "passport",
  "national_id",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AGE_KYC_IMAGE_MAX_BYTES, files: 3 },
});

const acceptPhotos = upload.fields([
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

const acceptDocument = upload.fields([
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
]);

const acceptSelfie = upload.fields([
  { name: "idFront", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

function fileToPhoto(file: Express.Multer.File | undefined, label: string) {
  if (!file?.buffer?.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} photo is missing.` });
  }
  const mimeType = sniffAgeKycImageMime(file.buffer);
  if (!mimeType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} must be a JPEG, PNG, or WebP photo.`,
    });
  }
  return { mimeType, base64: file.buffer.toString("base64") };
}

function statusFor(error: TRPCError): number {
  if (error.code === "TOO_MANY_REQUESTS") return 429;
  if (error.code === "FORBIDDEN") return 403;
  if (error.code === "BAD_REQUEST") return 400;
  if (error.code === "PRECONDITION_FAILED") return 412;
  if (error.code === "BAD_GATEWAY") return 502;
  return 400;
}

async function handlePrecheck(req: Request, res: Response): Promise<void> {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const documentType = String(req.body?.documentType ?? "").trim() as AgeKycDocumentType;
    if (!DOC_TYPES.includes(documentType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Choose the ID type first." });
    }
    await assertTurnstileToken({
      token: typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken : undefined,
      action: "age_kyc",
      ip: getClientIp(req),
    });
    const result = await precheckAgeKyc({
      ip: getClientIp(req),
      documentType,
      idFront: fileToPhoto(files?.idFront?.[0], "ID front"),
      idBack: fileToPhoto(files?.idBack?.[0], "ID back"),
      selfie: fileToPhoto(files?.selfie?.[0], "Selfie"),
    });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof TRPCError) {
      res.status(statusFor(error)).json({
        verified: false,
        rejectionReason: error.message,
        passToken: null,
        error: error.message,
      });
      return;
    }
    res.status(502).json({
      verified: false,
      rejectionReason: "The picture check did not finish. Tap Check again.",
      passToken: null,
      error: "The picture check did not finish. Tap Check again.",
    });
  }
}

async function handleDocumentCheck(req: Request, res: Response): Promise<void> {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const documentType = String(req.body?.documentType ?? "").trim() as AgeKycDocumentType;
    if (!DOC_TYPES.includes(documentType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Choose the ID type first." });
    }
    await assertTurnstileToken({
      token: typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken : undefined,
      action: "age_kyc",
      ip: getClientIp(req),
    });
    const result = await precheckIdDocument({
      ip: getClientIp(req),
      documentType,
      idFront: fileToPhoto(files?.idFront?.[0], "ID front"),
      idBack: fileToPhoto(files?.idBack?.[0], "ID back"),
    });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof TRPCError) {
      res.status(statusFor(error)).json({
        verified: false,
        rejectionReason: error.message,
        documentToken: null,
        issuer: null,
        error: error.message,
      });
      return;
    }
    res.status(502).json({
      verified: false,
      rejectionReason: "The ID check did not finish. Tap Check this ID again.",
      documentToken: null,
      issuer: null,
      error: "The ID check did not finish. Tap Check this ID again.",
    });
  }
}

async function handleSelfieMatch(req: Request, res: Response): Promise<void> {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const documentToken = String(req.body?.documentToken ?? "").trim();
    if (!documentToken) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Check the ID front and back first." });
    }
    await assertTurnstileToken({
      token: typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken : undefined,
      action: "age_kyc",
      ip: getClientIp(req),
    });
    const result = await precheckSelfieMatch({
      ip: getClientIp(req),
      documentToken,
      idFront: fileToPhoto(files?.idFront?.[0], "ID front"),
      selfie: fileToPhoto(files?.selfie?.[0], "Selfie"),
    });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof TRPCError) {
      res.status(statusFor(error)).json({
        verified: false,
        rejectionReason: error.message,
        passToken: null,
        error: error.message,
      });
      return;
    }
    res.status(502).json({
      verified: false,
      rejectionReason: "The selfie check did not finish. Tap Check this selfie again.",
      passToken: null,
      error: "The selfie check did not finish. Tap Check this selfie again.",
    });
  }
}

/** Binary JPEG upload — the same pattern Stripe Identity / Onfido use for speed. */
export function registerAgeKycFastRoute(app: Express): void {
  app.post("/api/age-kyc/precheck", (req, res, next) => {
    const ip = getClientIp(req);
    if (isIpBlocked(ip)) {
      res.status(403).json({
        verified: false,
        rejectionReason: "This network is blocked.",
        passToken: null,
        error: "This network is blocked.",
      });
      return;
    }
    try {
      checkIpNamespaceLimit("auth", ip);
    } catch (error) {
      if (error instanceof TRPCError) {
        res.status(statusFor(error)).json({
          verified: false,
          rejectionReason: error.message,
          passToken: null,
          error: error.message,
        });
        return;
      }
      throw error;
    }
    res.setHeader("Cache-Control", "private, no-store");
    acceptPhotos(req, res, (err: unknown) => {
      if (err) {
        res.status(413).json({
          verified: false,
          rejectionReason: "Those pictures are too large. Take them again in clear light.",
          passToken: null,
          error: "Those pictures are too large. Take them again in clear light.",
        });
        return;
      }
      void handlePrecheck(req, res).catch(next);
    });
  });

  app.post("/api/age-kyc/document", (req, res, next) => {
    const ip = getClientIp(req);
    if (isIpBlocked(ip)) {
      res.status(403).json({
        verified: false,
        rejectionReason: "This network is blocked.",
        documentToken: null,
        error: "This network is blocked.",
      });
      return;
    }
    try {
      checkIpNamespaceLimit("auth", ip);
    } catch (error) {
      if (error instanceof TRPCError) {
        res.status(statusFor(error)).json({
          verified: false,
          rejectionReason: error.message,
          documentToken: null,
          error: error.message,
        });
        return;
      }
      throw error;
    }
    res.setHeader("Cache-Control", "private, no-store");
    acceptDocument(req, res, (err: unknown) => {
      if (err) {
        res.status(413).json({
          verified: false,
          rejectionReason: "Those pictures are too large. Take them again in clear light.",
          documentToken: null,
          error: "Those pictures are too large. Take them again in clear light.",
        });
        return;
      }
      void handleDocumentCheck(req, res).catch(next);
    });
  });

  app.post("/api/age-kyc/selfie", (req, res, next) => {
    const ip = getClientIp(req);
    if (isIpBlocked(ip)) {
      res.status(403).json({
        verified: false,
        rejectionReason: "This network is blocked.",
        passToken: null,
        error: "This network is blocked.",
      });
      return;
    }
    try {
      checkIpNamespaceLimit("auth", ip);
    } catch (error) {
      if (error instanceof TRPCError) {
        res.status(statusFor(error)).json({
          verified: false,
          rejectionReason: error.message,
          passToken: null,
          error: error.message,
        });
        return;
      }
      throw error;
    }
    res.setHeader("Cache-Control", "private, no-store");
    acceptSelfie(req, res, (err: unknown) => {
      if (err) {
        res.status(413).json({
          verified: false,
          rejectionReason: "That selfie is too large. Take it again in clear light.",
          passToken: null,
          error: "That selfie is too large. Take it again in clear light.",
        });
        return;
      }
      void handleSelfieMatch(req, res).catch(next);
    });
  });
}
