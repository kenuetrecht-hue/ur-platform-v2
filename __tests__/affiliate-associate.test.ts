import { describe, it, expect } from "vitest";
import {
  AFFILIATE_ASSOCIATE_ID,
  canChatAffiliateAssociate,
  isAffiliateOnlyAi,
} from "../server/_core/affiliate-associate-ai";
import {
  buildAffiliatePostBody,
  scheduleAffiliatePost,
  scheduleWeeklyAutoPosts,
} from "../server/_core/affiliate-social-post-service";
import {
  createVideoCall,
  joinVideoCall,
} from "../server/_core/video-call-service";
import {
  sendFriendRequest,
  acceptFriendRequest,
  registerSocialUser,
} from "../server/_core/social-service";
import {
  purchaseCreatorVoicePack,
  hasCreatorVoiceAccess,
  purchaseAffiliateVoicePack,
  hasAffiliateVoiceAccess,
  purchaseAiVideoTalkPack,
  hasAiVideoTalkAccess,
} from "../server/_core/ai-premium-media-service";
import { isCreatorAiId } from "../server/_core/ai-creator-registry";
import { listCreatorsForClient } from "../server/_core/ai-creator-registry";

describe("Affiliate Associate AI", () => {
  it("registers associate id and hides from public list", () => {
    expect(isCreatorAiId(AFFILIATE_ASSOCIATE_ID)).toBe(true);
    expect(isAffiliateOnlyAi(AFFILIATE_ASSOCIATE_ID)).toBe(true);
    const publicList = listCreatorsForClient();
    expect(publicList.some((c) => c.id === AFFILIATE_ASSOCIATE_ID)).toBe(false);
  });

  it("allows enrolled affiliates and owner to chat", () => {
    expect(canChatAffiliateAssociate({ isPlatformOwner: false, isEnrolledAffiliate: false })).toBe(false);
    expect(canChatAffiliateAssociate({ isPlatformOwner: false, isEnrolledAffiliate: true })).toBe(true);
    expect(canChatAffiliateAssociate({ isPlatformOwner: true, isEnrolledAffiliate: false })).toBe(true);
  });

  it("builds platform-specific affiliate post copy", () => {
    const body = buildAffiliatePostBody({
      affiliateLink: "https://urplatform.app/link/test",
      platform: "facebook",
    });
    expect(body).toContain("https://urplatform.app/link/test");
    expect(body).toContain("AI-generated promo");
  });

  it("schedules weekly auto-posts", () => {
    const posts = scheduleWeeklyAutoPosts({
      affiliateUserId: "aff-1",
      affiliateLink: "https://urplatform.app/link/aff-1",
      platforms: ["facebook", "twitter"],
    });
    expect(posts).toHaveLength(2);
    expect(posts[0]?.autoPost).toBe(true);
  });
});

describe("Friend video calls", () => {
  it("creates video room between friends", () => {
    registerSocialUser({ userId: "u1", email: "a@test.com", displayName: "A" });
    registerSocialUser({ userId: "u2", email: "b@test.com", displayName: "B" });
    const req = sendFriendRequest({
      fromUserId: "u1",
      fromEmail: "a@test.com",
      fromName: "A",
      toEmail: "b@test.com",
    });
    acceptFriendRequest({ userId: "u2", friendshipId: req.id });
    const room = createVideoCall({ callerUserId: "u1", calleeUserId: "u2" });
    expect(room.status).toBe("ringing");
    const joined = joinVideoCall({ roomId: room.id, userId: "u2" });
    expect(joined.status).toBe("active");
  });
});

describe("Premium AI voice/video", () => {
  it("grants creator voice, affiliate voice, and AI video talk packs", () => {
    purchaseCreatorVoicePack({ userId: "c1", userEmail: "c@test.com" });
    expect(hasCreatorVoiceAccess("c1")).toBe(true);
    purchaseAffiliateVoicePack({ userId: "aff-v", userEmail: "aff@test.com" });
    expect(hasAffiliateVoiceAccess("aff-v")).toBe(true);
    purchaseAiVideoTalkPack({ userId: "u3", userEmail: "u3@test.com" });
    expect(hasAiVideoTalkAccess("u3")).toBe(true);
  });
});
