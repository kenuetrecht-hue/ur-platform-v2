import fs from "fs";
import os from "os";
import path from "path";
import { randomBytes } from "crypto";
import type { Request, Response } from "express";

const ID_RE = /^[a-f0-9]{32}$/;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

type MediaMeta = { contentType: string; extension: string };

export function memberFeedMediaDir(): string {
  const fromEnv = process.env.MEMBER_FEED_MEDIA_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(os.tmpdir(), "ur-member-feed");
}

function assertMediaMeta(contentType: string, extension: string): void {
  if (!ALLOWED_TYPES.has(contentType) || !/^[a-z0-9]+$/.test(extension)) {
    throw new Error("unsupported media");
  }
}

async function writeMediaMeta(id: string, meta: MediaMeta): Promise<void> {
  await fs.promises.writeFile(path.join(memberFeedMediaDir(), `${id}.json`), JSON.stringify(meta));
}

export async function saveMemberFeedMedia(params: {
  bytes: Buffer;
  contentType: string;
  extension: string;
}): Promise<{ id: string }> {
  assertMediaMeta(params.contentType, params.extension);
  const id = randomBytes(16).toString("hex");
  const dir = memberFeedMediaDir();
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, `${id}.${params.extension}`), params.bytes);
  await writeMediaMeta(id, { contentType: params.contentType, extension: params.extension });
  return { id };
}

/** Copies a file already on disk so a long video is not held in memory. */
export async function saveMemberFeedMediaFromPath(params: {
  sourcePath: string;
  contentType: string;
  extension: string;
}): Promise<{ id: string }> {
  assertMediaMeta(params.contentType, params.extension);
  const id = randomBytes(16).toString("hex");
  const dir = memberFeedMediaDir();
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.copyFile(params.sourcePath, path.join(dir, `${id}.${params.extension}`));
  await writeMediaMeta(id, { contentType: params.contentType, extension: params.extension });
  return { id };
}

export function serveMemberFeedMedia(req: Request, res: Response): void {
  const id = String(req.params.id ?? "");
  if (!ID_RE.test(id)) {
    res.status(404).end();
    return;
  }
  const dir = memberFeedMediaDir();
  let meta: MediaMeta;
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), "utf8")) as MediaMeta;
  } catch {
    res.status(404).end();
    return;
  }
  if (!ALLOWED_TYPES.has(meta.contentType) || !/^[a-z0-9]+$/.test(meta.extension)) {
    res.status(404).end();
    return;
  }
  const filePath = path.join(dir, `${id}.${meta.extension}`);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.status(404).end();
    return;
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", meta.contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=86400");

  const range = typeof req.headers.range === "string" ? req.headers.range : "";
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).end();
      return;
    }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : stat.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= stat.size) {
      res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).end();
      return;
    }
    const safeEnd = Math.min(end, stat.size - 1);
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${safeEnd}/${stat.size}`);
    res.setHeader("Content-Length", String(safeEnd - start + 1));
    fs.createReadStream(filePath, { start, end: safeEnd }).pipe(res);
    return;
  }

  res.status(200);
  res.setHeader("Content-Length", String(stat.size));
  fs.createReadStream(filePath).pipe(res);
}
