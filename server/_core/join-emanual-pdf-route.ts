import type { Application } from "express";
import { JOIN_EMANUAL_PDF_FILE_NAME, JOIN_EMANUAL_PDF_PATH, buildJoinEmanualPdfBytes } from "../../lib/join-emanual-pdf";

/** Public file: every member can save the free join e-manual to their phone. */
export function registerJoinEmanualPdfRoute(app: Application): void {
  app.get(JOIN_EMANUAL_PDF_PATH, (_req, res) => {
    const bytes = buildJoinEmanualPdfBytes();
    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${JOIN_EMANUAL_PDF_FILE_NAME}"`);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Length", String(bytes.byteLength));
    res.end(Buffer.from(bytes));
  });
}
