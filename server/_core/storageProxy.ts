import type { Express, Request, Response } from "express";
import { isIpBlocked } from "./api-security";
import { ENV } from "./env";
import { sdk } from "./sdk";

const SAFE_KEY_PATTERN = /^[a-zA-Z0-9/_.-]+$/;

function isValidStorageKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.includes("..") || key.startsWith("/")) return false;
  return SAFE_KEY_PATTERN.test(key);
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: Request, res: Response) => {
    const key = (req.params as unknown as Record<string, string>)[0];

    if (!key || !isValidStorageKey(key)) {
      res.status(400).json({ error: "Invalid storage key" });
      return;
    }

    if (isIpBlocked(req.socket.remoteAddress ?? "unknown")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(503).json({ error: "Storage unavailable" });
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        console.error(`[StorageProxy] backend error: ${forgeResp.status}`);
        res.status(502).json({ error: "Storage backend error" });
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).json({ error: "Storage unavailable" });
        return;
      }

      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).json({ error: "Storage unavailable" });
    }
  });
}
