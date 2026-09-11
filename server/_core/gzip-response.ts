import type { Request, Response, NextFunction } from "express";
import { createGzip } from "zlib";

const SKIP_PATHS = ["/api/age-kyc/", "/manus-storage/", "/api/ws/", "/api/oauth/"];
const COMPRESSIBLE = /json|text|javascript|xml|svg|urlencoded/i;

export function shouldGzipResponse(params: {
  acceptEncoding?: string;
  path?: string;
  contentType?: string;
  contentEncoding?: string;
}): boolean {
  if (!/\bgzip\b/i.test(params.acceptEncoding ?? "")) return false;
  const path = params.path ?? "";
  if (SKIP_PATHS.some((prefix) => path.startsWith(prefix))) return false;
  if (params.contentEncoding) return false;
  const type = params.contentType ?? "";
  return !type || COMPRESSIBLE.test(type);
}

/** Gzip JSON and text for the website and phone app. Skip photos, uploads, and live sockets. */
export function gzipResponseMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "HEAD") {
    next();
    return;
  }

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  let gzip: ReturnType<typeof createGzip> | null = null;
  let decided = false;

  const startGzip = () => {
    if (decided) return gzip;
    decided = true;
    const allowed = shouldGzipResponse({
      acceptEncoding: String(req.headers["accept-encoding"] ?? ""),
      path: req.path || "",
      contentType: String(res.getHeader("Content-Type") ?? ""),
      contentEncoding: String(res.getHeader("Content-Encoding") ?? ""),
    });
    if (!allowed) return null;
    gzip = createGzip();
    res.setHeader("Content-Encoding", "gzip");
    res.removeHeader("Content-Length");
    gzip.on("data", (chunk: Buffer) => {
      originalWrite(chunk);
    });
    gzip.on("error", () => {
      originalEnd();
    });
    return gzip;
  };

  res.write = ((chunk: unknown, encoding?: BufferEncoding, cb?: (error?: Error | null) => void) => {
    const stream = startGzip();
    if (!stream) return originalWrite(chunk as never, encoding as never, cb);
    return stream.write(chunk as never, encoding as never, cb);
  }) as typeof res.write;

  res.end = ((chunk?: unknown, encoding?: BufferEncoding, cb?: () => void) => {
    const stream = startGzip();
    if (!stream) return originalEnd(chunk as never, encoding as never, cb);
    if (chunk) stream.end(chunk as never, encoding as never, cb);
    else stream.end(cb);
    return res;
  }) as typeof res.end;

  next();
}
