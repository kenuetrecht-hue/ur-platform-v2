import { describe, it, expect } from "vitest";
import {
  hasStaticWebBuild,
  resolveWebDistPath,
} from "../server/_core/static-web";

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
});
