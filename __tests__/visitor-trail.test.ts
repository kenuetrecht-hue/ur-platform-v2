import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isPrivateTrailPath,
  sanitizeTrailLabel,
  sanitizeTrailPath,
  summarizeVisitorTrail,
  type VisitorTrailEvent,
} from "../lib/visitor-trail";

function event(partial: Partial<VisitorTrailEvent> & Pick<VisitorTrailEvent, "visitorId" | "kind" | "path">): VisitorTrailEvent {
  return {
    label: partial.kind === "page" ? "Opened this page" : "Join",
    signedIn: false,
    seconds: 0,
    createdAt: "2026-10-01T16:00:00.000Z",
    ...partial,
  };
}

describe("visitor trail", () => {
  it("keeps the page path and drops tokens in the address bar", () => {
    expect(sanitizeTrailPath("/login?code=secret#access_token=abc")).toBe("/login");
    expect(sanitizeTrailPath("https://urplatform.llc/signup?email=a@b.com")).toBe("/signup");
    expect(sanitizeTrailPath("/owner-ai/business")).toBeNull();
    expect(isPrivateTrailPath("/admin")).toBe(true);
  });

  it("keeps button names and drops emails and keys", () => {
    expect(sanitizeTrailLabel("  Join   free  ")).toBe("Join free");
    expect(sanitizeTrailLabel("person@example.com")).toBeNull();
    expect(sanitizeTrailLabel("sk_live_abc123secret")).toBeNull();
  });

  it("shows who arrived, who never signed up, and where they stopped", () => {
    const now = new Date("2026-10-01T18:00:00.000Z");
    const report = summarizeVisitorTrail(
      [
        event({ visitorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", kind: "page", path: "/", createdAt: "2026-10-01T16:00:00.000Z" }),
        event({ visitorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", kind: "button", path: "/", label: "Join", createdAt: "2026-10-01T16:01:00.000Z" }),
        event({ visitorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", kind: "page", path: "/signup", createdAt: "2026-10-01T16:01:10.000Z" }),
        event({ visitorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", kind: "dwell", path: "/signup", label: "time on page", seconds: 90, createdAt: "2026-10-01T16:02:40.000Z" }),
        event({ visitorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", kind: "page", path: "/", createdAt: "2026-10-01T16:05:00.000Z" }),
        event({ visitorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", kind: "page", path: "/services", createdAt: "2026-10-01T16:06:00.000Z" }),
        event({
          visitorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          kind: "page",
          path: "/signup",
          signedIn: true,
          createdAt: "2026-10-01T16:10:00.000Z",
        }),
      ],
      now,
    );

    expect(report.todayVisitors).toBe(3);
    expect(report.todayUnsigned).toBe(2);
    expect(report.weekSignedUp).toBe(1);
    expect(report.weekUnsigned).toBe(2);
    expect(report.stoppedOn[0]).toEqual({ path: "/signup", people: 1 });
    expect(report.stoppedOn.find((row) => row.path === "/services")?.people).toBe(1);
    expect(report.slowPages[0]?.path).toBe("/signup");
    expect(report.slowPages[0]?.averageSeconds).toBe(90);
    expect(report.topButtons[0]).toMatchObject({ label: "Join", path: "/", presses: 1 });
    expect(report.recent[0]?.signedUp).toBe(true);
  });

  it("wires the trail onto the public site and the owner People tab only", () => {
    const tracker = readFileSync("components/visitor-trail-tracker.tsx", "utf8");
    const panel = readFileSync("components/visitor-trail-panel.tsx", "utf8");
    const layout = readFileSync("app/_layout.tsx", "utf8");
    const people = readFileSync("app/owner-ops.tsx", "utf8");
    const router = readFileSync("server/routers/visitor-trail-router.ts", "utf8");

    expect(layout).toContain("VisitorTrailTracker");
    expect(people).toContain("VisitorTrailPanel");
    expect(tracker).toContain("input, textarea, select");
    expect(tracker).not.toContain("input.value");
    expect(tracker).not.toContain("password");
    expect(panel).toContain("does not save");
    expect(panel).toContain("LETTERING_ON_WHITE");
    expect(router).toContain('securePublicProcedure("system")');
    expect(router).toContain("ownerProcedure");
    expect(router).not.toContain("publicProcedure.query");
  });
});