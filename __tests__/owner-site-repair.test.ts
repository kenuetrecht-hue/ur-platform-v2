import { mkdtemp, readFile } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isAllowedRepairPath,
  isApplySitePatchCommand,
  isOwnerSiteRepairRequest,
  parseSitePatches,
} from "../lib/owner-site-repair";
import { inferIncidentFromOpsChat, _resetOpsStateForTests } from "../server/_core/platform-ops-service";
import {
  applyStagedSitePatches,
  stageSitePatches,
  _resetSiteRepairsForTests,
} from "../server/_core/owner-site-repair-service";

describe("owner site repair paths", () => {
  it("allows app source and refuses secrets", () => {
    expect(isAllowedRepairPath("components/owner-emergency-alarm.tsx")).toBe(true);
    expect(isAllowedRepairPath("server/_core/platform-ops-ai.ts")).toBe(true);
    expect(isAllowedRepairPath(".env")).toBe(false);
    expect(isAllowedRepairPath("server/_core/secrets.ts")).toBe(false);
    expect(isAllowedRepairPath("server/_core/owner-auth.ts")).toBe(false);
    expect(isAllowedRepairPath("server/_core/env.ts")).toBe(false);
    expect(isAllowedRepairPath("../server/index.ts")).toBe(false);
    expect(isAllowedRepairPath("package.json")).toBe(false);
    expect(isAllowedRepairPath(".github/workflows/deploy.yml")).toBe(false);
  });

  it("parses a patch block and drops blocked files", () => {
    const reply = [
      "Here is the fix.",
      "```json",
      JSON.stringify({
        patches: [
          { path: "components/ok.tsx", content: "export const ok = 1;\n" },
          { path: ".env", content: "SECRET=1\n" },
          { path: "server/_core/secrets.ts", content: "export const x = 1;\n" },
        ],
      }),
      "```",
    ].join("\n");
    expect(parseSitePatches(reply)).toEqual([
      { path: "components/ok.tsx", content: "export const ok = 1;\n" },
    ]);
  });

  it("treats a website fix request as repair, not a live incident", () => {
    const userMessage = "Please fix the website so the red banner does not freeze the page.";
    const aiReply = [
      "INCIDENT SUMMARY: site freeze",
      "PROBLEM: banner covers the site",
      "PROPOSED FIX: update the code",
    ].join("\n");
    expect(isOwnerSiteRepairRequest(userMessage)).toBe(true);
    expect(isApplySitePatchCommand("APPLY SITE PATCH")).toBe(true);
    expect(isApplySitePatchCommand("please APPLY SITE PATCH now")).toBe(false);
    expect(inferIncidentFromOpsChat("platform-doctor-ai", userMessage, aiReply)).toBeNull();
    expect(
      isOwnerSiteRepairRequest("Unauthorized access found and confirmed in the admin route."),
    ).toBe(false);
  });
});

describe("apply staged site patches", () => {
  const previousToken = process.env.OWNER_SITE_REPAIR_GITHUB_TOKEN;

  afterEach(() => {
    _resetSiteRepairsForTests();
    _resetOpsStateForTests();
    if (previousToken === undefined) delete process.env.OWNER_SITE_REPAIR_GITHUB_TOKEN;
    else process.env.OWNER_SITE_REPAIR_GITHUB_TOKEN = previousToken;
  });

  it("writes allowed files only on this computer when no GitHub token is set", async () => {
    delete process.env.OWNER_SITE_REPAIR_GITHUB_TOKEN;
    const root = await mkdtemp(path.join(os.tmpdir(), "ur-repair-"));
    stageSitePatches("owner-1", [{ path: "components/ok.tsx", content: "export const ok = 1;\n" }]);
    const reply = await applyStagedSitePatches({
      ownerUserId: "owner-1",
      isPlatformOwner: true,
      rootDir: root,
    });
    expect(reply).toMatch(/Wrote 1 file/);
    expect(await readFile(path.join(root, "components", "ok.tsx"), "utf8")).toBe("export const ok = 1;\n");
  });

  it("refuses anyone who is not the platform owner", async () => {
    stageSitePatches("owner-1", [{ path: "components/ok.tsx", content: "export const ok = 1;\n" }]);
    await expect(
      applyStagedSitePatches({ ownerUserId: "owner-1", isPlatformOwner: false }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("sends the new file to GitHub main and does not echo the token", async () => {
    process.env.OWNER_SITE_REPAIR_GITHUB_TOKEN = "github_pat_test_token_value";
    const calls: Array<{ url: string; method?: string; auth?: string }> = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url: String(url),
        method: init?.method,
        auth: headers.get("authorization") ?? undefined,
      });
      if (!init?.method) {
        return new Response(JSON.stringify({ sha: "abc123" }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    stageSitePatches("owner-1", [{ path: "components/ok.tsx", content: "export const ok = 1;\n" }]);
    const reply = await applyStagedSitePatches({
      ownerUserId: "owner-1",
      isPlatformOwner: true,
      fetchImpl,
    });
    expect(reply).toMatch(/GitHub main/);
    expect(reply).not.toMatch(/github_pat_test_token_value/);
    expect(calls.some((call) => call.method === "PUT" && call.url.includes("components/ok.tsx"))).toBe(true);
    expect(calls.every((call) => !call.url.includes("github_pat_test_token_value"))).toBe(true);
  });
});
