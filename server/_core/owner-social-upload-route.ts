import fs from "fs";
import os from "os";
import path from "path";
import type { Express, Request, Response } from "express";
import multer from "multer";
import { isPlatformOwner } from "./owner-auth";
import { getContentCreatorProfile } from "./partner-program-service";
import { sdk } from "./sdk";
import { uploadViaAyrshare } from "./ayrshare-client";

const MAX_BYTES = 100 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, callback) => {
      callback(null, `ur-social-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    },
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

type MediaKind = "image" | "video" | "file";

export function sniffSocialUpload(bytes: Buffer): { kind: MediaKind; contentType: string; extension: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { kind: "image", contentType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: "image", contentType: "image/png", extension: "png" };
  }
  if (bytes.length >= 6 && (bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return { kind: "image", contentType: "image/gif", extension: "gif" };
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { kind: "image", contentType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "%PDF") {
    return { kind: "file", contentType: "application/pdf", extension: "pdf" };
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { kind: "video", contentType: "video/webm", extension: "webm" };
  }
  const brand = bytes.length >= 12 ? bytes.subarray(4, 8).toString("ascii") : "";
  if (brand === "ftyp") {
    const major = bytes.subarray(8, 12).toString("ascii");
    if (major.startsWith("qt")) return { kind: "video", contentType: "video/quicktime", extension: "mov" };
    return { kind: "video", contentType: "video/mp4", extension: "mp4" };
  }
  return null;
}

function safeFileName(original: string, extension: string): string {
  const base = path.basename(original).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 60);
  const stem = base.replace(/\.[^.]+$/, "") || "upload";
  return `${stem}.${extension}`;
}

export function registerOwnerSocialUploadRoute(app: Express): void {
  app.post("/api/owner-social-upload", (req, res) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        const tooBig = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
        res.status(tooBig ? 413 : 400).json({
          error: { message: tooBig ? "That file is over 100 MB." : "That file could not be read." },
        });
        return;
      }
      void handleOwnerSocialUpload(req, res);
    });
  });
}

async function handleOwnerSocialUpload(req: Request, res: Response): Promise<void> {
  const storedPath = req.file?.path;
  try {
    let user = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      user = null;
    }
    const creator = user ? getContentCreatorProfile(String(user.id)) : null;
    if (!user || (!isPlatformOwner(user) && !creator)) {
      res.status(403).json({ error: { message: "Only a content creator or the platform owner can upload a post file." } });
      return;
    }
    if (!storedPath) {
      res.status(400).json({ error: { message: "Choose a picture, video, or PDF first." } });
      return;
    }
    const bytes = await fs.promises.readFile(storedPath);
    const sniffed = sniffSocialUpload(bytes);
    if (!sniffed) {
      res.status(400).json({
        error: { message: "Use a JPEG, PNG, WebP, GIF, MP4, MOV, WebM, or PDF." },
      });
      return;
    }
    const uploaded = await uploadViaAyrshare({
      bytes,
      fileName: safeFileName(req.file?.originalname ?? "upload", sniffed.extension),
      contentType: sniffed.contentType,
    });
    res.status(200).json({ url: uploaded.url, kind: sniffed.kind, name: safeFileName(req.file?.originalname ?? "upload", sniffed.extension) });
  } catch {
    res.status(502).json({ error: { message: "Ayrshare could not store that file. Try again." } });
  } finally {
    if (storedPath) await fs.promises.unlink(storedPath).catch(() => undefined);
  }
}
