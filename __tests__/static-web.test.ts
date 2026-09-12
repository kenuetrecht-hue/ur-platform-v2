import { describe, it, expect } from "vitest";
import {
  hasStaticWebBuild,
  resolveWebDistPath,
} from "../server/_core/static-web";
import { readFileSync } from "fs";

describe("static-web", () => {
  it("prefers WEB_DIST_PATH when set", () => {
    const previous = process.env.WEB_DIST_PATH;
    process.env.WEB_DIST_PATH = "/app/dist-web";
    expect(resolveWebDistPath()).toBe("/app/dist-web");
    if (previous == null) delete process.env.WEB_DIST_PATH;
    else process.env.WEB_DIST_PATH = previous;
  });

  it("does not claim a website exists in an empty folder", () => {
    expect(hasStaticWebBuild("/tmp/ur-does-not-have-a-web-export")).toBe(false);
  });

  it("serves the phone wrap files as real files, not the HTML app", () => {
    const source = readFileSync("server/_core/static-web.ts", "utf8");
    expect(source).toContain("registerPwaInstallFiles");
    expect(source).toContain("manifest.webmanifest");
    expect(source).toContain("sw.js");
  });
});
