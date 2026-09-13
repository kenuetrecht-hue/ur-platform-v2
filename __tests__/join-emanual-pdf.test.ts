import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { JOIN_EMANUAL_TITLE } from "../lib/join-emanual";
import { buildJoinEmanualPdfBytes, buildJoinEmanualPlainText, JOIN_EMANUAL_PDF_PATH } from "../lib/join-emanual-pdf";
import { shouldClearStoredSessionAfterRestore, isUnrecoverableSessionError } from "../lib/auth-session-restore";

describe("join e-manual download", () => {
  it("builds a real PDF the phone can save", () => {
    const bytes = buildJoinEmanualPdfBytes();
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("%%EOF");
    expect(buildJoinEmanualPlainText()).toContain(JOIN_EMANUAL_TITLE);
    expect(JOIN_EMANUAL_PDF_PATH).toBe("/e-manual.pdf");
  });

  it("puts a Download to this phone button on the e-manual page", () => {
    const page = readFileSync("app/e-manual.tsx", "utf8");
    const route = readFileSync("server/_core/index.ts", "utf8");
    expect(page).toContain("downloadJoinEmanual");
    expect(page).toContain("Download to this phone");
    expect(route).toContain("registerJoinEmanualPdfRoute");
  });
});

describe("saved sign-in after a slow phone reopen", () => {
  it("does not wipe tokens just because the restore was slow", () => {
    expect(shouldClearStoredSessionAfterRestore({ unrecoverable: false })).toBe(false);
    expect(shouldClearStoredSessionAfterRestore({ unrecoverable: true })).toBe(true);
    expect(isUnrecoverableSessionError(new Error("Invalid Refresh Token: Refresh Token Not Found"))).toBe(
      true,
    );
    expect(isUnrecoverableSessionError(new Error("Supabase session restore timed out after 5000ms"))).toBe(
      false,
    );
    expect(readFileSync("lib/auth-context.tsx", "utf8")).toContain("getStoredUserJson");
    expect(readFileSync("lib/auth-context.tsx", "utf8")).not.toContain(
      "if (storedAccess || storedRefresh) {\n          await clearAuthStorage();",
    );
  });
});
