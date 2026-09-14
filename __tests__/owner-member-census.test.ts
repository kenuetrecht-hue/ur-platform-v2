import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { buildMemberCensus, classifyJoinedMember } from "../lib/owner-member-census";

describe("owner member census", () => {
  it("splits content creators from regular members and keeps names and emails", () => {
    const now = new Date("2026-09-14T03:00:00.000Z");
    const census = buildMemberCensus({
      ownerEmail: "ken.uetrecht.ur@gmail.com",
      now,
      creators: [
        {
          displayName: "Pat Creator",
          userEmail: "pat@example.com",
          enrolledAt: "2026-09-01",
          paidSubscriberCount: 4,
          unpaidFollowerCount: 11,
        },
      ],
      users: [
        {
          name: "Ken",
          email: "ken.uetrecht.ur@gmail.com",
          createdAt: "2026-08-01T00:00:00.000Z",
          lastSignedIn: "2026-09-14T02:50:00.000Z",
        },
        {
          name: "Pat Creator",
          email: "pat@example.com",
          createdAt: "2026-09-01T00:00:00.000Z",
          lastSignedIn: "2026-09-13T00:00:00.000Z",
        },
        {
          name: "Sam Member",
          email: "sam@example.com",
          createdAt: "2026-09-10T00:00:00.000Z",
          lastSignedIn: "2026-09-14T02:55:00.000Z",
        },
      ],
    });

    expect(census.joinedCount).toBe(3);
    expect(census.creatorCount).toBe(1);
    expect(census.regularMemberCount).toBe(1);
    expect(census.onSiteNowCount).toBe(2);
    expect(census.creators[0]).toMatchObject({
      name: "Pat Creator",
      email: "pat@example.com",
      paidSubscriberCount: 4,
      unpaidFollowerCount: 11,
    });
    expect(census.paidSubscriberCount).toBe(4);
    expect(census.unpaidFollowerCount).toBe(11);
    expect(census.members[0]).toMatchObject({ name: "Sam Member", email: "sam@example.com" });
    expect(classifyJoinedMember({ email: "pat@example.com", ownerEmail: "ken@x.com", creatorEmails: new Set(["pat@example.com"]) })).toBe(
      "creator",
    );
  });

  it("is owner-only on Administration", () => {
    const ops = readFileSync("app/owner-ops.tsx", "utf8");
    const router = readFileSync("server/routers/platform-ops-router.ts", "utf8");
    expect(ops).toContain("OwnerMemberCensusPanel");
    expect(readFileSync("components/owner-member-census-panel.tsx", "utf8")).toContain("paid subscriber");
    expect(readFileSync("components/owner-member-census-panel.tsx", "utf8")).toContain("unpaid follower");
    expect(router).toContain("getMemberCensus");
    expect(router).toContain("ownerProcedure.query(() => getOwnerMemberCensus())");
  });
});
