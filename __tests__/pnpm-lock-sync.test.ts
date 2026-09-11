import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

/** Railway runs `pnpm install --frozen-lockfile`. A new package in package.json
 * without a lockfile update fails the whole live rebuild. */
describe("pnpm lockfile", () => {
  it("lists every package.json dependency so Railway can install", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const lock = readFileSync("pnpm-lock.yaml", "utf8");
    const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    const missing = names.filter((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return !new RegExp(`^\\s+'?${escaped}'?:`, "m").test(lock);
    });
    expect(missing).toEqual([]);
  });
});
