import { beforeEach, describe, expect, it } from "vitest";
import { ENV } from "../server/_core/env";
import {
  _resetSocialStateForTests,
  ensureOwnerWelcomeFriendship,
  listFriends,
  listInboxMail,
  registerSocialUser,
} from "../server/_core/social-service";

describe("owner welcome friend", () => {
  const ownerEmail = ENV.platformOwnerEmail || "owner@ur.test";
  const ownerId = "owner-test-id";

  beforeEach(() => {
    _resetSocialStateForTests();
  });

  it("connects new members with the platform owner as first friend", async () => {
    registerSocialUser({
      userId: ownerId,
      email: ownerEmail,
      displayName: "Platform Owner",
    });

    await ensureOwnerWelcomeFriendship({
      userId: "member-1",
      email: "newbie@ur.test",
      displayName: "Alex",
    });

    const memberFriends = listFriends("member-1");
    expect(memberFriends).toHaveLength(1);
    expect(memberFriends[0]?.peerUserId).toBe(ownerId);

    const ownerFriends = listFriends(ownerId);
    expect(ownerFriends).toHaveLength(1);
    expect(ownerFriends[0]?.peerUserId).toBe("member-1");

    const inbox = listInboxMail("member-1");
    expect(inbox[0]?.subject).toContain("Thank you for joining UR");
    expect(inbox[0]?.body).toContain("questions about the website or the app");
    expect(inbox[0]?.body).toContain("Friends & Messages");
  });

  it("retries after the owner id was missing on first join", async () => {
    await ensureOwnerWelcomeFriendship({
      userId: "member-late",
      email: "late@ur.test",
      displayName: "Late",
    });
    expect(listFriends("member-late")).toHaveLength(0);

    registerSocialUser({
      userId: ownerId,
      email: ownerEmail,
      displayName: "Platform Owner",
    });

    await ensureOwnerWelcomeFriendship({
      userId: "member-late",
      email: "late@ur.test",
      displayName: "Late",
    });

    expect(listFriends("member-late")).toHaveLength(1);
    expect(listFriends(ownerId)[0]?.peerUserId).toBe("member-late");
  });

  it("keeps one friendship when join is requested twice at once", async () => {
    registerSocialUser({
      userId: ownerId,
      email: ownerEmail,
      displayName: "Platform Owner",
    });

    const [first, second] = await Promise.all([
      ensureOwnerWelcomeFriendship({
        userId: "member-race",
        email: "race@ur.test",
        displayName: "Race",
      }),
      ensureOwnerWelcomeFriendship({
        userId: "member-race",
        email: "race@ur.test",
        displayName: "Race",
      }),
    ]);

    expect(first?.id).toBe(second?.id);
    expect(listFriends(ownerId)).toHaveLength(1);
    expect(listFriends("member-race")[0]?.peerUserId).toBe(ownerId);
  });

  it("does not friend the platform owner with themselves", async () => {
    registerSocialUser({
      userId: ownerId,
      email: ownerEmail,
      displayName: "Platform Owner",
    });

    const result = await ensureOwnerWelcomeFriendship({
      userId: ownerId,
      email: ownerEmail,
      displayName: "Platform Owner",
    });

    expect(result).toBeNull();
    expect(listFriends(ownerId)).toHaveLength(0);
  });
});
