import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { isLivePwaHost } from "../lib/pwa-hosts";

describe("phone home-screen wrap", () => {
  it("treats the live Railway site as an install host", () => {
    expect(isLivePwaHost("ur-platform-v2-production.up.railway.app")).toBe(true);
    expect(isLivePwaHost("urplatform.llc")).toBe(true);
    expect(isLivePwaHost("localhost")).toBe(false);
  });

  it("does not hang the live site with the gzip response wrapper", () => {
    const server = readFileSync("server/_core/index.ts", "utf8");
    expect(server).not.toContain("gzipResponseMiddleware");
  });
});
