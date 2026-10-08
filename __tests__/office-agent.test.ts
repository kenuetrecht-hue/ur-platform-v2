import { describe, expect, it, beforeEach } from "vitest";
import {
  applyOfficeAgentChatAction,
  approveOfficeAgentBill,
  fileOfficeAgentBill,
  grantOfficeAgent,
  hasOfficeAgentAccess,
  resetOfficeAgentForTests,
} from "../server/_core/office-agent-service";

describe("office agent desk", () => {
  beforeEach(() => {
    resetOfficeAgentForTests();
  });

  it("includes the platform owner and a paid desk", () => {
    expect(hasOfficeAgentAccess("member-1", false)).toBe(false);
    expect(hasOfficeAgentAccess("member-1", true)).toBe(true);
    grantOfficeAgent("member-1");
    expect(hasOfficeAgentAccess("member-1", false)).toBe(true);
  });

  it("keeps an approved bill from moving money", () => {
    grantOfficeAgent("creator-1");
    const filed = fileOfficeAgentBill({
      userId: "creator-1",
      isPlatformOwner: false,
      creatorId: "contentmate",
      payee: "City power",
      amountCents: 8400,
      dueDate: "2026-11-01",
      note: "October",
    });
    expect(filed.status).toBe("needs_approval");
    expect(filed.moneyMoved).toBe(false);
    const approved = approveOfficeAgentBill({
      userId: "creator-1",
      isPlatformOwner: false,
      creatorId: "contentmate",
      billId: filed.id,
    });
    expect(approved.status).toBe("approved");
    expect(approved.moneyMoved).toBe(false);
  });

  it("lets the business steward file a bill for the owner only", () => {
    const bill = fileOfficeAgentBill({
      userId: "owner-1",
      isPlatformOwner: true,
      creatorId: "platform-business-steward-ai",
      payee: "Host",
      amountCents: 2000,
      dueDate: "2026-11-02",
    });
    expect(bill.creatorId).toBe("platform-business-steward-ai");
    expect(() =>
      fileOfficeAgentBill({
        userId: "member-2",
        isPlatformOwner: false,
        creatorId: "platform-business-steward-ai",
        payee: "Host",
        amountCents: 2000,
        dueDate: "2026-11-02",
      }),
    ).toThrow(/owner/i);
  });

  it("does not send office work when the desk is locked", () => {
    const reply = applyOfficeAgentChatAction({
      userId: "member-9",
      isPlatformOwner: false,
      creatorId: "contentmate",
      userMessage: "Email sam@example.com about the shoot",
      aiReply: "On it.\n[[OFFICE email|sam@example.com|Shoot|See you Tuesday]]",
      senderEmail: "member@example.com",
      senderName: "Member",
    });
    expect(reply).toMatch(/\$29\.00/);
    expect(reply).toMatch(/Nothing was sent/);
    expect(reply).not.toContain("[[OFFICE");
  });

  it("does not send mail just because a caption mentions email", () => {
    grantOfficeAgent("creator-3");
    const reply = applyOfficeAgentChatAction({
      userId: "creator-3",
      isPlatformOwner: false,
      creatorId: "contentmate",
      userMessage: "Write an email caption for the video",
      aiReply: "Caption here.\n[[OFFICE email|sam@example.com|Shoot|See you Tuesday]]",
      senderEmail: "creator@example.com",
      senderName: "Creator",
    });
    expect(reply).toBe("Caption here.");
    expect(reply).not.toMatch(/Email sent/);
  });

  it("ignores an office tag the person did not ask for", () => {
    grantOfficeAgent("creator-2");
    const reply = applyOfficeAgentChatAction({
      userId: "creator-2",
      isPlatformOwner: false,
      creatorId: "contentmate",
      userMessage: "Write a caption for the video",
      aiReply: "Here is a caption.\n[[OFFICE email|sam@example.com|Shoot|See you Tuesday]]",
      senderEmail: "creator@example.com",
      senderName: "Creator",
    });
    expect(reply).toBe("Here is a caption.");
  });

  it("files a plainly worded bill without a hidden tag", () => {
    const reply = applyOfficeAgentChatAction({
      userId: "owner-1",
      isPlatformOwner: true,
      creatorId: "platform-business-steward-ai",
      userMessage: "Prepare a bill for the host, $20, due 2026-11-02.",
      aiReply: "I can help with that.",
      senderEmail: "owner@example.com",
      senderName: "Owner",
    });
    expect(reply).toMatch(/host is on the desk for \$20\.00/i);
    expect(reply).toMatch(/does not send the money/i);
  });

  it("lets Business Steward prepare a bill without claiming it was paid", () => {
    const reply = applyOfficeAgentChatAction({
      userId: "owner-1",
      isPlatformOwner: true,
      creatorId: "platform-business-steward-ai",
      userMessage: "[[OFFICE bill|Host|20.00|2026-11-02|November]]",
      aiReply: "I'll put that on the desk.",
      senderEmail: "owner@example.com",
      senderName: "Owner",
    });
    expect(reply).toMatch(/does not send the money/i);
    expect(reply).toMatch(/\$20\.00/);
  });
});
