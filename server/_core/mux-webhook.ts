import express, { type Express, type Request, type Response } from "express";
import {
  applyMuxAssetEvent,
  parseMuxWebhookEvent,
  verifyMuxWebhookSignature,
} from "./mux-video-engine";
import { attachMuxPlaybackToSession } from "./class-replay-service";
import { getMuxWebhookSecret } from "./secrets";

export function registerMuxWebhook(app: Express): void {
  app.post(
    "/api/mux/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    (req: Request, res: Response) => {
      if (!getMuxWebhookSecret()) {
        res.status(503).json({ ok: false });
        return;
      }
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
      const signature = typeof req.headers["mux-signature"] === "string" ? req.headers["mux-signature"] : "";
      if (!verifyMuxWebhookSignature(rawBody, signature)) {
        res.status(401).json({ ok: false });
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        res.status(400).json({ ok: false });
        return;
      }
      const event = parseMuxWebhookEvent(payload);
      if (!event) {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }
      const applied = applyMuxAssetEvent(event);
      if (applied.sessionId && applied.upload?.status === "ready" && applied.upload.muxPlaybackId) {
        attachMuxPlaybackToSession({
          sessionId: applied.sessionId,
          muxUploadId: applied.upload.id,
          muxAssetId: applied.upload.muxAssetId,
          muxPlaybackId: applied.upload.muxPlaybackId,
          durationSeconds: applied.upload.durationSeconds,
        });
      }
      res.status(200).json({ ok: true, handled: applied.handled });
    },
  );
}
