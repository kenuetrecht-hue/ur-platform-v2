import { describe, expect, it, beforeEach } from "vitest";
import {
  acknowledgeSecurityIncidentNotice,
  getActiveSecurityNoticeForMember,
  publishSecurityIncidentNotice,
  _resetSecurityIncidentNoticesForTests,
} from "../server/_core/security-incident-notice-service";

describe("Security incident member notice", () => {
  beforeEach(() => {
    _resetSecurityIncidentNoticesForTests();
  });

  it("does not require a notice until the owner publishes one", () => {
    const status = getActiveSecurityNoticeForMember("member-1");
    expect(status.required).toBe(false);
    expect(status.notice).toBeNull();
    expect(status.promise.toLowerCase()).toContain("notify you immediately on this website");
  });

  it("blocks every member until they acknowledge the latest notice", () => {
    const notice = publishSecurityIncidentNotice({
      ownerUserId: "owner-1",
      title: "Security notice — change your password",
      body: "We learned account information may have been exposed. Change your UR password now.",
    });
    expect(notice.emailQueued).toBe(true);
    expect(notice.emailSent).toBe(false);
    expect(getActiveSecurityNoticeForMember("member-1").required).toBe(true);
    expect(getActiveSecurityNoticeForMember("member-2").required).toBe(true);
    acknowledgeSecurityIncidentNotice({ userId: "member-1", noticeId: notice.id });
    expect(getActiveSecurityNoticeForMember("member-1").required).toBe(false);
    expect(getActiveSecurityNoticeForMember("member-2").required).toBe(true);
  });
});
