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
